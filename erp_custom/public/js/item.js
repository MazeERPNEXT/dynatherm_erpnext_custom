frappe.ui.form.on('Item', {
    validate: function(frm) {
        if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness) {
            const density = 7.85;
            let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * density) / 1000000;
            let final_weight = weight.toFixed(2);

            frm.set_value("custom_kilogramskgs", final_weight);

            frm.set_value("weight_per_unit", final_weight);
            frm.set_value("weight_uom", "Kg");  
        } else {
            frm.set_value("custom_kilogramskgs", 0);
            frm.set_value("weight_per_unit", 0);
            frm.set_value("weight_uom", "Kg");
        }
    }
});
