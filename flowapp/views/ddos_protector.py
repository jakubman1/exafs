from flask import Blueprint, render_template, request, flash, redirect, url_for

from flowapp import db
from flowapp.auth import auth_required, user_or_admin_required, admin_required
from flowapp.forms import DDPDeviceForm
from flowapp.models import DDPDevice, DDPRulePreset

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
