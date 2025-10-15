frappe.ui.form.on('Estimate Item', {
    validate: function(frm) {
        if (frm.doc.length && frm.doc.width && frm.doc.thickness && frm.doc.density) {
            let weight = (frm.doc.length * frm.doc.width * frm.doc.thickness * frm.doc.density) / 1000000;
            let final_weight = flt(weight, 2); // round to 2 decimals

            frm.set_value("quantity", final_weight);

            // Commented: not needed now
            // frm.set_value("weight_per_unit", final_weight);
            // frm.set_value("custom_weight_per_unit", final_weight);
            // frm.set_value("weight_total_weight", "Kg");
            // frm.set_value("custom_weight_total_weight", "Kg");
        } else {
            frm.set_value("quantity", 0);

            // Commented: not needed now
            // frm.set_value("weight_per_unit", 0);
            // frm.set_value("custom_weight_per_unit", 0);
            // frm.set_value("weight_total_weight", "Kg");
            // frm.set_value("custom_weight_total_weight", "Kg");
        }


        if (frm.doc.items && frm.doc.items.length > 0) {
            frm.doc.items.forEach(row => {
                row.quantity = frm.doc.quantity || 0;
                row.total_weight = "Kg";
            });
            frm.refresh_field("items");
        }
    },


    quantity: function(frm) {
        if (frm.doc.items && frm.doc.items.length > 0) {
            frm.doc.items.forEach(row => {
                row.quantity = frm.doc.quantity || 0;
                row.total_weight = "Kg"; 
            });
            frm.refresh_field("items");
        }
    }
});


frappe.ui.form.on('Estimate Item', {
    items_add: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        row.quantity = frm.doc.quantity || 0;
        row.total_weight = "Kg"; 
        frm.refresh_field("items");
    }
});
