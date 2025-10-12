frappe.ui.form.on('BOM', {
    validate: function(frm) {
        if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness && frm.doc.custom_density) {
            let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * frm.doc.custom_density) / 1000000;
            let final_weight = flt(weight, 2); // round to 2 decimals

            frm.set_value("custom_kilogramskgs", final_weight);

            // Commented: not needed now
            // frm.set_value("weight_per_unit", final_weight);
            // frm.set_value("custom_weight_per_unit", final_weight);
            // frm.set_value("weight_uom", "Kg");
            // frm.set_value("custom_weight_uom", "Kg");
        } else {
            frm.set_value("custom_kilogramskgs", 0);

            // Commented: not needed now
            // frm.set_value("weight_per_unit", 0);
            // frm.set_value("custom_weight_per_unit", 0);
            // frm.set_value("weight_uom", "Kg");
            // frm.set_value("custom_weight_uom", "Kg");
        }


        if (frm.doc.items && frm.doc.items.length > 0) {
            frm.doc.items.forEach(row => {
                row.qty = frm.doc.custom_kilogramskgs || 0;
                row.uom = "Kgs";
            });
            frm.refresh_field("items");
        }
    },


    custom_kilogramskgs: function(frm) {
        if (frm.doc.items && frm.doc.items.length > 0) {
            frm.doc.items.forEach(row => {
                row.qty = frm.doc.custom_kilogramskgs || 0;
                row.uom = "Kgs"; 
            });
            frm.refresh_field("items");
        }
    }
});


frappe.ui.form.on('BOM Item', {
    items_add: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        row.qty = frm.doc.custom_kilogramskgs || 0;
        row.uom = "Kgs"; 
        frm.refresh_field("items");
    }
});
