
frappe.ui.form.on('Item', {
    validate: function(frm) {
        if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness) {
            const density = 7.85;
            let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * density) / 1000000;
            frm.set_value("custom_kilogramskgs", weight.toFixed(2));
        } else {
            frm.set_value("custom_kilogramskgs", 0);
        }
    }
});
