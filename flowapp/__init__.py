# -*- coding: utf-8 -*-
import babel

from flask import Flask, redirect, render_template, session, url_for
from flask_sso import SSO
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from flask_migrate import Migrate

__version__ = "0.7.1"


db = SQLAlchemy()
migrate = Migrate()
csrf = CSRFProtect()


def create_app():
    app = Flask(__name__)
    # Map SSO attributes from ADFS to session keys under session['user']
    #: Default attribute map
    SSO_ATTRIBUTE_MAP = {
        "eppn": (True, "eppn"),
        "cn": (False, "cn"),
    }

    # db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)

    app.config.setdefault("VERSION", __version__)
    app.config.setdefault("SSO_ATTRIBUTE_MAP", SSO_ATTRIBUTE_MAP)
    app.config.setdefault("SSO_LOGIN_URL", "/login")

    # This attaches the *flask_sso* login handler to the SSO_LOGIN_URL,
    ext = SSO(app=app)

    from flowapp import models, constants, validators
    from .views.admin import admin
    from .views.rules import rules
    from .views.api_v1 import api as api_v1
    from .views.api_v2 import api as api_v2
    from .views.api_v3 import api as api_v3
    from .views.api_keys import api_keys
    from .auth import auth_required
    from .views.dashboard import dashboard

    # no need for csrf on api because we use JWT
    csrf.exempt(api_v1)
    csrf.exempt(api_v2)
    csrf.exempt(api_v3)

    app.register_blueprint(admin, url_prefix="/admin")
    app.register_blueprint(rules, url_prefix="/rules")
    app.register_blueprint(api_keys, url_prefix="/api_keys")
    app.register_blueprint(api_v1, url_prefix="/api/v1")
    app.register_blueprint(api_v2, url_prefix="/api/v2")
    app.register_blueprint(api_v3, url_prefix="/api/v3")
    app.register_blueprint(dashboard, url_prefix="/dashboard")

    # menu items for the main menu
    with app.test_request_context():
        app.config["MAIN_MENU"] = {
            "edit": [
                {"name": "Add IPv4", "url": url_for("rules.ipv4_rule")},
                {"name": "Add IPv6", "url": url_for("rules.ipv6_rule")},
                {"name": "Add RTBH", "url": url_for("rules.rtbh_rule")},
                {"name": "API Key", "url": url_for("api_keys.all")},
            ],
            "admin": [
                {
                    "name": "Commands Log",
                    "url": url_for("admin.log"),
                    "divide_after": True,
                },
                {"name": "Users", "url": url_for("admin.users")},
                {"name": "Add User", "url": url_for("admin.user")},
                {"name": "Organizations", "url": url_for("admin.organizations")},
                {
                    "name": "Add Org.",
                    "url": url_for("admin.organization"),
                    "divide_after": True,
                },
                {"name": "Action", "url": url_for("admin.actions")},
                {"name": "Add action", "url": url_for("admin.action")},
                {"name": "RTBH Communities", "url": url_for("admin.communities")},
                {"name": "Add RTBH Comm.", "url": url_for("admin.community")},
            ],
        }
        app.config['DASHBOARD'] = {
            'ipv4': {
                'name': 'IPv4',
                'url_handler': 'dashboard.index',
                'macro_file': 'macros.j2',
                'macro_name': 'build_ip_tbody'
            },
            'ipv6': {
                'name': 'IPv6',
                'url_handler': 'dashboard.index',
                'macro_file': 'macros.j2',
                'macro_name': 'build_ip_tbody'
            },
            'rtbh': {
                'name': 'RTBH',
                'url_handler': 'dashboard.index',
                'macro_file': 'macros.j2',
                'macro_name': 'build_rtbh_tbody'
            },
        }

    @ext.login_handler
    def login(user_info):
        try:
            uuid = user_info.get("eppn")
        except KeyError:
            uuid = False
            return redirect("/")
        else:
            user = db.session.query(models.User).filter_by(uuid=uuid).first()
            try:
                session["user_uuid"] = user.uuid
                session["user_email"] = user.uuid
                session["user_name"] = user.name
                session["user_id"] = user.id
                session["user_roles"] = [role.name for role in user.role.all()]
                session["user_orgs"] = ", ".join(
                    org.name for org in user.organization.all()
                )
                session["user_role_ids"] = [role.id for role in user.role.all()]
                session["user_org_ids"] = [org.id for org in user.organization.all()]
                roles = [i > 1 for i in session["user_role_ids"]]
                session["can_edit"] = True if all(roles) and roles else []
            except AttributeError:
                return redirect("/")

            return redirect("/")

    @app.route("/logout")
    def logout():
        session["user_uuid"] = False
        session["user_id"] = False
        session.clear()
        return redirect(app.config.get("LOGOUT_URL"))

    @app.route("/")
    @auth_required
    def index():
        try:
            rtype = session[constants.TYPE_ARG]
        except KeyError:
            rtype = "ipv4"

        try:
            rstate = session[constants.RULE_ARG]
        except KeyError:
            rstate = "active"

        try:
            sorter = session[constants.SORT_ARG]
        except KeyError:
            sorter = constants.DEFAULT_SORT

        try:
            orderer = session[constants.ORDER_ARG]
        except KeyError:
            orderer = constants.DEFAULT_ORDER

        return redirect(
            url_for(
                "dashboard.index",
                rtype=rtype,
                rstate=rstate,
                sort=sorter,
                order=orderer,
            )
        )

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()

    # HTTP error handling
    @app.errorhandler(404)
    def not_found(error):
        return render_template("errors/404.j2"), 404

    @app.errorhandler(500)
    def internal_error(exception):
        app.logger.error(exception)
        return render_template("errors/500.j2"), 500

    @app.context_processor
    def utility_processor():
        def editable_rule(rule):
            if rule:
                validators.editable_range(
                    rule, models.get_user_nets(session["user_id"])
                )
                return True
            return False

        return dict(editable_rule=editable_rule)

    @app.context_processor
    def inject_main_menu():
        """
        inject main menu config to templates
        used in default template to create main menu
        """
        return {"main_menu": app.config.get("MAIN_MENU")}
    
    @app.context_processor
    def inject_dashboard():
        """
        inject dashboard config to templates
        used in submenu dashboard to create dashboard tables
        """
        return {"dashboard": app.config.get("DASHBOARD")}

    @app.template_filter("strftime")
    def format_datetime(value):
        format = "y/MM/dd HH:mm"

        return babel.dates.format_datetime(value, format)

    return app
