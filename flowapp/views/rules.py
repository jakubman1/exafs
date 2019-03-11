# flowapp/views/admin.py
import jwt

from datetime import datetime, timedelta
from flask import Blueprint, render_template, redirect, flash, request, url_for, session
import requests
from operator import ge, lt

from flowapp.output import ROUTE_MODELS, announce_route, log_route, log_withdraw, RULE_TYPES
from flowapp.forms import RTBHForm, IPv4Form, IPv6Form
from flowapp.models import Action, RTBH, Flowspec4, Flowspec6, get_user_nets, get_user_actions, \
    get_ipv4_model_if_exists, get_ipv6_model_if_exists, insert_initial_communities, get_user_communities, Community, \
    get_rtbh_model_if_exists
from flowapp.auth import auth_required, admin_required, user_or_admin_required, localhost_only
from flowapp.utils import webpicker_to_datetime, flash_errors, datetime_to_webpicker, round_to_ten_minutes

from flowapp import db, app, messages, RULES_KEY

rules = Blueprint('rules', __name__, template_folder='templates')

DATA_MODELS = {1: RTBH, 4: Flowspec4, 6: Flowspec6}
DATA_FORMS = {1: RTBHForm, 4: IPv4Form, 6: IPv6Form}
DATA_TEMPLATES = {1: 'forms/rtbh_rule.j2', 4: 'forms/ipv4_rule.j2', 6: 'forms/ipv6_rule.j2'}
DATA_TABLES = {1: 'RTBH', 4: 'flowspec4', 6: 'flowspec6'}


@rules.route('/reactivate/<int:rule_type>/<int:rule_id>', methods=['GET', 'POST'])
@auth_required
@user_or_admin_required
def reactivate_rule(rule_type, rule_id):
    """
    Set new time for the rule of given type identified by id
    :param rule_type: string - type of rule
    :param rule_id: integer - id of the rule
    """
    model_name = DATA_MODELS[rule_type]
    form_name = DATA_FORMS[rule_type]

    model = db.session.query(model_name).get(rule_id)
    form = form_name(request.form, obj=model)
    form.net_ranges = get_user_nets(session['user_id'])

    if rule_type > 2:
        form.action.choices = [(g.id, g.name)
                               for g in db.session.query(Action).order_by('name')]
        form.action.data = model.action_id

    if rule_type == 1:
        form.community.choices = get_user_communities(session['user_role_ids'])

    if rule_type == 4:
        form.protocol.data = model.protocol

    if rule_type == 6:
        form.next_header.data = model.next_header

    # do not need to validate - all is readonly
    if request.method == 'POST':
        # set new expiration date
        model.expires = round_to_ten_minutes(webpicker_to_datetime(form.expires.data))
        # set again the active state
        model.rstate_id = 1
        db.session.commit()
        flash(u'Rule reactivated', 'alert-success')
        # announce route
        route_model = ROUTE_MODELS[rule_type]
        route = route_model(model, messages.ANNOUNCE)
        announce_route(route)
        # log changes
        log_route(session['user_id'], model, rule_type)

        return redirect(url_for('index'))
    else:
        flash_errors(form)

    form.expires.data = datetime_to_webpicker(model.expires)
    for field in form:
        if field.name not in ['expires', 'csrf_token']:
            field.render_kw = {'disabled': 'disabled'}

    action_url = url_for('rules.reactivate_rule', rule_type=rule_type, rule_id=rule_id)

    return render_template(DATA_TEMPLATES[rule_type], form=form, action_url=action_url)


@rules.route('/delete/<int:rule_type>/<int:rule_id>', methods=['GET'])
@auth_required
@user_or_admin_required
def delete_rule(rule_type, rule_id):
    """
    Delete rule with given id and type
    :param rule_type: string - type of rule to be deleted
    :param rule_id: integer - rule id
    """
    rules_dict = request.cookies.get(RULES_KEY)
    rules_dict = jwt.decode(rules_dict, app.config.get('JWT_SECRET'), algorithms=['HS256'])

    print(rules_dict)
    rules = rules_dict[str(rule_type)]
    model_name = DATA_MODELS[rule_type]
    route_model = ROUTE_MODELS[rule_type]

    model = db.session.query(model_name).get(rule_id)

    if model.id in rules:
        # withdraw route
        route = route_model(model, messages.WITHDRAW)
        announce_route(route)

        log_withdraw(session['user_id'], route, rule_type, model.id)

        # delete from db
        db.session.delete(model)
        db.session.commit()
        flash(u'Rule deleted', 'alert-success')

    else:
        flash(u'You can not delete this rule', 'alert-warning')

    return redirect(url_for('index'))


@rules.route('/add_ipv4_rule', methods=['GET', 'POST'])
@auth_required
@user_or_admin_required
def ipv4_rule():
    net_ranges = get_user_nets(session['user_id'])
    form = IPv4Form(request.form)

    # add values to form instance
    form.action.choices = get_user_actions(session['user_role_ids'])

    form.net_ranges = net_ranges

    if request.method == 'POST' and form.validate():

        model = get_ipv4_model_if_exists(form.data, 1)

        if model:
            model.expires = round_to_ten_minutes(webpicker_to_datetime(form.expires.data))
            flash_message = u'Existing IPv4 Rule found. Expiration time was updated to new value.'
        else:
            model = Flowspec4(
                source=form.source.data,
                source_mask=form.source_mask.data,
                source_port=form.source_port.data,
                destination=form.dest.data,
                destination_mask=form.dest_mask.data,
                destination_port=form.dest_port.data,
                protocol=form.protocol.data,
                flags=";".join(form.flags.data),
                packet_len=form.packet_len.data,
                expires=round_to_ten_minutes(webpicker_to_datetime(form.expires.data)),
                comment=form.comment.data,
                action_id=form.action.data,
                user_id=session['user_id'],
                rstate_id=1
            )
            flash_message = u'IPv4 Rule saved'
            db.session.add(model)

        db.session.commit()
        flash(flash_message, 'alert-success')

        # announce route
        route = messages.create_ipv4(model, messages.ANNOUNCE)
        announce_route(route)
        # log changes
        log_route(session['user_id'], model, RULE_TYPES['IPv4'])

        return redirect(url_for('index'))
    else:
        for field, errors in form.errors.items():
            for error in errors:
                print(u"Error in the %s field - %s" % (
                    getattr(form, field).label.text,
                    error
                ))

    default_expires = datetime.now() + timedelta(days=7)
    form.expires.data = datetime_to_webpicker(default_expires)

    return render_template('forms/ipv4_rule.j2', form=form, action_url=url_for('rules.ipv4_rule'))


@rules.route('/add_ipv6_rule', methods=['GET', 'POST'])
@auth_required
@user_or_admin_required
def ipv6_rule():
    net_ranges = get_user_nets(session['user_id'])
    form = IPv6Form(request.form)

    form.action.choices = get_user_actions(session['user_role_ids'])
    form.net_ranges = net_ranges

    if request.method == 'POST' and form.validate():

        model = get_ipv6_model_if_exists(form.data, 1)

        if model:
            model.expires = round_to_ten_minutes(webpicker_to_datetime(form.expires.data))
            flash_message = u'Existing IPv4 Rule found. Expiration time was updated to new value.'
        else:

            model = Flowspec6(
                source=form.source.data,
                source_mask=form.source_mask.data,
                source_port=form.source_port.data,
                destination=form.dest.data,
                destination_mask=form.dest_mask.data,
                destination_port=form.dest_port.data,
                next_header=form.next_header.data,
                flags=";".join(form.flags.data),
                packet_len=form.packet_len.data,
                expires=round_to_ten_minutes(webpicker_to_datetime(form.expires.data)),
                comment=form.comment.data,
                action_id=form.action.data,
                user_id=session['user_id'],
                rstate_id=1
            )
            flash_message = u'IPv6 Rule saved'
            db.session.add(model)

        db.session.commit()
        flash(flash_message, 'alert-success')

        # announce routes
        route = messages.create_ipv6(model, messages.ANNOUNCE)
        announce_route(route)

        # log changes
        log_route(session['user_id'], model, RULE_TYPES['IPv6'])

        return redirect(url_for('index'))
    else:
        for field, errors in form.errors.items():
            for error in errors:
                print(u"Error in the %s field - %s" % (
                    getattr(form, field).label.text,
                    error
                ))

    default_expires = datetime.now() + timedelta(days=7)
    form.expires.data = datetime_to_webpicker(default_expires)

    return render_template('forms/ipv6_rule.j2', form=form, action_url=url_for('rules.ipv6_rule'))


@rules.route('/add_rtbh_rule', methods=['GET', 'POST'])
@auth_required
@user_or_admin_required
def rtbh_rule():
    all_com = db.session.query(Community).all()
    if not all_com:
        insert_initial_communities()

    net_ranges = get_user_nets(session['user_id'])
    form = RTBHForm(request.form)

    form.community.choices = get_user_communities(session['user_role_ids'])
    form.net_ranges = net_ranges

    if request.method == 'POST' and form.validate():

        model = get_rtbh_model_if_exists(form.data, 1)

        if model:
            model.expires = round_to_ten_minutes(webpicker_to_datetime(form.expires.data))
            flash_message = u'Existing RTBH Rule found. Expiration time was updated to new value.'
        else:

            model = RTBH(
                ipv4=form.ipv4.data,
                ipv4_mask=form.ipv4_mask.data,
                ipv6=form.ipv6.data,
                ipv6_mask=form.ipv6_mask.data,
                community_id=form.community.data,
                expires=round_to_ten_minutes(webpicker_to_datetime(form.expires.data)),
                comment=form.comment.data,
                user_id=session['user_id'],
                rstate_id=1
            )
            db.session.add(model)
            db.session.commit()
            flash_message = u'RTBH Rule saved'

        flash(flash_message, 'alert-success')
        # announce routes
        route = messages.create_rtbh(model, messages.ANNOUNCE)
        announce_route(route)
        # log changes
        log_route(session['user_id'], model, RULE_TYPES['RTBH'])

        return redirect(url_for('index'))
    else:
        for field, errors in form.errors.items():
            for error in errors:
                print(u"Error in the %s field - %s" % (
                    getattr(form, field).label.text,
                    error
                ))

    default_expires = datetime.now() + timedelta(days=7)
    form.expires.data = datetime_to_webpicker(default_expires)

    return render_template('forms/rtbh_rule.j2', form=form, action_url=url_for('rules.rtbh_rule'))


@rules.route('/export')
@auth_required
@admin_required
def export():
    rules4 = db.session.query(Flowspec4).order_by(Flowspec4.expires.desc()).all()
    rules6 = db.session.query(Flowspec6).order_by(Flowspec6.expires.desc()).all()
    rules = {4: rules4, 6: rules6}

    actions = db.session.query(Action).all()
    actions = {action.id: action for action in actions}

    rules_rtbh = db.session.query(RTBH).order_by(RTBH.expires.desc()).all()

    announce_all_routes()

    return render_template('pages/dashboard_admin.j2', rules=rules, actions=actions, rules_rtbh=rules_rtbh, today=datetime.now())


@rules.route('/announce_all', methods=['GET'])
@localhost_only
def announce_all():
    announce_all_routes(messages.ANNOUNCE)
    return ' '


@rules.route('/withdraw_expired', methods=['GET'])
@localhost_only
def withdraw_expired():
    announce_all_routes(messages.WITHDRAW)
    return ' '


def announce_all_routes(action=messages.ANNOUNCE):
    """
    get routes from db and send it to ExaBGB api

    @TODO take the request away, use some kind of messaging (maybe celery?)
    :param action: action with routes - announce valid routes or withdraw expired routes
    """
    today = datetime.now()
    comp_func = ge if action == messages.ANNOUNCE else lt

    rules4 = db.session.query(Flowspec4).filter(Flowspec4.rstate_id == 1).filter(comp_func(Flowspec4.expires, today)).order_by(
        Flowspec4.expires.desc()).all()
    rules6 = db.session.query(Flowspec6).filter(Flowspec6.rstate_id == 1).filter(comp_func(Flowspec6.expires, today)).order_by(
        Flowspec6.expires.desc()).all()
    rules_rtbh = db.session.query(RTBH).filter(RTBH.rstate_id == 1).filter(ge(RTBH.expires, today)).order_by(RTBH.expires.desc()).all()

    output4 = [messages.create_ipv4(rule, action) for rule in rules4]
    output6 = [messages.create_ipv6(rule, action) for rule in rules6]
    output_rtbh = [messages.create_rtbh(rule, action) for rule in rules_rtbh]

    output = []
    output.extend(output4)
    output.extend(output6)
    output.extend(output_rtbh)

    for message in output:
        requests.post('http://localhost:5000/', data={'command': message})

    if action == messages.WITHDRAW:
        map(set_withdraw_state, rules4)
        map(set_withdraw_state, rules6)
        map(set_withdraw_state, rules_rtbh)


def set_withdraw_state(rule):
    """
    set rule state to withdrawed in db
    :param rule: rule to update, can be any of rule types
    :return: none
    """
    rule.rstate_id = 2
    db.session.commit()


