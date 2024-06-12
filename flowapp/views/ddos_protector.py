import requests
from flask import Blueprint, render_template, request, flash, redirect, url_for

from flowapp import db
from flowapp.auth import auth_required, user_or_admin_required, admin_required
from flowapp.ddp import get_available_ddos_protector_device, create_ddp_rule_from_extras, reactivate_ddp_rule
from flowapp.ddp_api import remove_rule_from_ddos_protector, get_rule_from_ddos_protector
from flowapp.forms import DDPDeviceForm
from flowapp.models import DDPDevice, DDPRulePreset, format_preset, DDPRuleExtras

ddos_protector = Blueprint("ddos-protector", __name__, template_folder="templates")


@ddos_protector.route("/new-device", methods=["GET", "POST"], defaults={"device_id": None})
@ddos_protector.route("/edit-device/<device_id>", methods=["GET", "POST"])
@auth_required
@admin_required
def edit_devices(device_id):
    device = None
    if device_id is not None:
        # Load preset from database
        device = db.session.get(DDPDevice, device_id)
        form = DDPDeviceForm(request.form, obj=device)
        form.populate_obj(device)
    else:
        form = DDPDeviceForm(request.form)

    if request.method == "POST" and form.validate():
        url = form.url.data
        if url[-1] == '/':
            url = url[:-1]
        if device_id is not None:
            device.url = url
            device.key = form.key.data
            device.redirect_command = form.redirect_command.data
            device.active = form.active.data
            device.key_header = form.key_header.data
            device.name = form.name.data
            db.session.commit()
            flash("Device edited", "alert-success")
        else:
            device = DDPDevice(
                url=url,
                key=form.key.data,
                redirect_command=form.redirect_command.data,
                active=form.active.data,
                key_header=form.key_header.data,
                name=form.name.data,
            )
            db.session.add(device)
            db.session.commit()
            flash("Device saved", "alert-success")
        return redirect(url_for("ddos-protector.devices"))

    action_url = url_for("ddos-protector.edit_devices", device_id=device_id)
    return render_template(
        "forms/simple_form.j2",
        title="Add new DDoS Protector device",
        form=form,
        action_url=action_url,
    )


@ddos_protector.route("/delete-device/<int:device_id>", methods=["GET"])
@auth_required
@admin_required
def delete_ddp_device(device_id):
    model = db.session.get(DDPDevice, device_id)
    db.session.delete(model)
    db.session.commit()
    flash("Device deleted", "alert-success")
    return redirect(url_for("ddos-protector.devices"))


@ddos_protector.route("/devices", methods=["GET"])
@auth_required
@user_or_admin_required
def devices():
    data = DDPDevice.query.all()
    return render_template("pages/ddp_devices.j2", devices=data)


@ddos_protector.route("/new-preset-callback", methods=["POST"])
@ddos_protector.route("/edit-preset-callback/<preset_id>", methods=["POST"])
@auth_required
@user_or_admin_required
def preset_form_callback(preset_id=None):
    keys = list(request.form.keys())
    values = list(request.form.values())
    data = {}
    for i in range(len(keys)):
        data[keys[i]] = values[i]

    del data["csrf_token"]
    model = DDPRulePreset(**data)
    if preset_id is None:
        db.session.add(model)
        db.session.commit()
        flash("Preset successfully added", "alert-success")
    else:
        model = db.session.query(DDPRulePreset).get(preset_id)
        model_dict = model.__dict__.copy()
        del model_dict["_sa_instance_state"]
        del model_dict["id"]
        for key in model_dict:
            if key in data:
                setattr(model, key, data[key])
            else:
                setattr(model, key, None)
        db.session.commit()
        flash("Preset successfully updated", "alert-success")
    return "saved"


@ddos_protector.route("/presets", methods=["GET"])
@auth_required
@user_or_admin_required
def presets():
    data = DDPRulePreset.query.all()
    preset_list = []
    for d in data:
        preset_list.append(format_preset(d))
    return render_template("pages/ddp_presets.j2", presets=preset_list)


@ddos_protector.route("/delete-preset/<int:preset_id>", methods=["GET"])
@auth_required
@admin_required
def delete_ddp_preset(preset_id):
    model = db.session.get(DDPRulePreset, preset_id)
    db.session.delete(model)
    db.session.commit()
    flash("Preset deleted", "alert-success")
    return redirect(url_for("ddos-protector.presets"))


@ddos_protector.route("/new-preset", methods=["GET", "POST"], defaults={"preset_id": None})
@ddos_protector.route("/edit-preset/<preset_id>", methods=["GET", "POST"])
@auth_required
@user_or_admin_required
def edit_preset(preset_id):
    preset = None
    if preset_id is not None:
        # Load preset from database
        preset = db.session.get(DDPRulePreset, preset_id)
    return render_template(
        "forms/ddp_preset_form.j2", preset=format_preset(preset), new=preset is None
    )


@ddos_protector.route("/duplicate-preset/<preset_id>", methods=["GET", "POST"])
@auth_required
@user_or_admin_required
def duplicate_preset(preset_id):
    # Load preset from database
    preset = db.session.get(DDPRulePreset, preset_id)
    if not preset:
        flash("Preset not found", "alert-danger")
        return redirect(url_for("ddos-protector.presets"))
    name = getattr(preset, "name")
    setattr(preset, "name", name + " - copy")
    return render_template(
        "forms/ddp_preset_form.j2", preset=format_preset(preset), new=True
    )


@ddos_protector.route("/rules", methods=["GET"])
@auth_required
def rules():
    args = request.args
    order = args.get('order')
    flowspec4 = args.get('flowspec4')
    flowspec6 = args.get('flowspec6')
    device = args.get('device')
    query = db.session.query(DDPRuleExtras)
    if flowspec4 is not None:
        try:
            query = query.filter(DDPRuleExtras.flowspec4_id == int(flowspec4))
        except ValueError:
            pass  # flowspec4 value was not numeric - skip filter
    if flowspec6 is not None:
        try:
            query = query.filter(DDPRuleExtras.flowspec6_id == int(flowspec6))
        except ValueError:
            pass  # flowspec6 value was not numeric - skip filter
    if device is not None:
        try:
            query = query.filter(DDPRuleExtras.device_id == int(device))
        except ValueError:
            pass  # device was not numeric - skip filter
    if order is not None:
        if order == 'flowspec4':
            query = query.order_by(DDPRuleExtras.flowspec4_id)
        elif order == 'flowspec6':
            query = query.order_by(DDPRuleExtras.flowspec6_id)

    rules_data = query.all()
    return render_template("pages/ddp_rules.j2", rules=rules_data, order=order)


@ddos_protector.route("/delete-rule-from-protector/<int:rule_extras_id>", methods=["GET"])
@auth_required
@admin_required
def delete_ddp_rule(rule_extras_id):
    model = db.session.get(DDPRuleExtras, rule_extras_id)
    if model.ddp_rule_id is not None and model.device_id is not None:
        try:
            result = remove_rule_from_ddos_protector(
                model.ddp_rule_id,
                model.device.url,
                model.device.key,
                model.device.key_header
            )
            if result.status_code == 200:
                flash("Rule deleted from DDoS Protector", "alert-success")
                model.ddp_rule_id = None
                model.device = None
                db.session.commit()
            else:
                flash('Could not remove the rule, status code ' +
                      str(result.status_code) +
                      '. Click the "Check rule on device" button to get the actual status')
        except requests.exceptions.ConnectionError as exc:
            flash("Rule could not be removed: " + str(exc), 'alert-danger')
    else:
        flash("Rule was already removed from DDoS Protector", "alert-info")
    return redirect(url_for("ddos-protector.rules"))


@ddos_protector.route("/resend-rule-from-protector/<int:rule_extras_id>", methods=["GET"])
@auth_required
@admin_required
def resend_ddp_rule(rule_extras_id):
    model = db.session.get(DDPRuleExtras, rule_extras_id)
    if model.ddp_rule_id is not None and model.device_id is not None:
        flash("Rule was already on the DDoS Protector device. Remove it before sending it again.", "alert-warning")
    else:
        device = get_available_ddos_protector_device()
        rule = {}
        if model.flowspec4_id is not None:
            rule = create_ddp_rule_from_extras(model, 4)
        elif model.flowspec6_id is not None:
            rule = create_ddp_rule_from_extras(model, 6)
        else:
            flash('Could not recreate the rule, rule not attached to any Flowspec rule - would never redirect to DDoS '
                  'Protector', 'alert-danger')
            return redirect(url_for("ddos-protector.rules"))
        reactivate_ddp_rule(model, rule, device)
    return redirect(url_for("ddos-protector.rules"))


@ddos_protector.route("/check-rule-on-protector/<int:rule_extras_id>", methods=["GET"])
@auth_required
@admin_required
def check_ddp_rule(rule_extras_id):
    model = db.session.get(DDPRuleExtras, rule_extras_id)
    if model is not None and model.ddp_rule_id is not None and model.device_id is not None:
        try:
            result = get_rule_from_ddos_protector(
                model.ddp_rule_id,
                model.device.url,
                model.device.key,
                model.device.key_header
            )
            if result.status_code == 200:
                data = result.json()
                model.ddp_rule_id = data['id']
                flash(
                    "Rule exists on " +
                    model.device.url +
                    ' with ID ' +
                    str(data['id']) +
                    '. <a href="' +
                    url_for('ddos-protector.get_ddp_rule', rule_extras_id=rule_extras_id) +
                    '" target="_blank" class="alert-link">See the full output</a>.', "alert-success")
                db.session.commit()
            elif result.status_code == 404:
                flash("Rule does not exist on " + model.device.url + '. Local information updated.', "alert-warning")
                model.ddp_rule_id = None
                model.device = None
                db.session.commit()
            else:
                flash('Could not check the rule status, DDoS Protector returned status code ' +
                      str(result.status_code) +
                      '. Try again later.', 'alert-danger')
        except requests.exceptions.ConnectionError as exc:
            flash("Could not connect to the device: " + str(exc), 'alert-danger')
    else:
        flash("Rule does not have any DDoS Protector device linked to it, can not verify", "alert-danger")
    return redirect(url_for("ddos-protector.rules"))


@ddos_protector.route("/get-rule-from-protector/<int:rule_extras_id>", methods=["GET"])
@auth_required
@admin_required
def get_ddp_rule(rule_extras_id):
    model = db.session.get(DDPRuleExtras, rule_extras_id)
    if model is not None and model.ddp_rule_id is not None and model.device_id is not None:
        try:
            result = get_rule_from_ddos_protector(
                model.ddp_rule_id,
                model.device.url,
                model.device.key,
                model.device.key_header
            )
            return render_template("pages/ddp_rule_raw.j2", status=result.status_code, data=result.json())
        except requests.exceptions.ConnectionError as exc:
            flash("Could not connect to the device: " + str(exc), 'alert-danger')
    else:
        flash("Rule does not have any DDoS Protector device linked to it, can not verify", "alert-danger")
    return redirect(url_for("ddos-protector.rules"))