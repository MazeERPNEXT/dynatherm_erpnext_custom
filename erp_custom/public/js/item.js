// frappe.ui.form.on('Item', {
//     validate: function(frm) {
//         if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness && frm.doc.custom_density) {
//             // const density = 7.85;
//             let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * frm.doc.custom_density) / 1000000;
//             let final_weight = weight.toFixed(2);

//             frm.set_value("custom_kilogramskgs", final_weight);

//             frm.set_value("weight_per_unit", final_weight);
//             frm.set_value("weight_uom", "Kg");  
//         } else {
//             frm.set_value("custom_kilogramskgs", 0);
//             frm.set_value("weight_per_unit", 0);
//             frm.set_value("weight_uom", "Kg");
//         }
//     }
// });


frappe.ui.form.on("Item", {
    onload: function(frm) {
        // Auto fetch thickness from Item Variant Attributes
        set_variant_thickness(frm);
    },

    refresh: function(frm) {
        set_variant_thickness(frm);
    },

    validate: function(frm) {

        // Auto calculate weight
        if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness && frm.doc.custom_density) {
            let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * frm.doc.custom_density) / 1000000;
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

function set_variant_thickness(frm) {
    if (!frm.doc.has_variants && frm.doc.variant_of) {
        // Only for variant items
        if (frm.doc.attributes && frm.doc.attributes.length > 0) {
            frm.doc.attributes.forEach(attr => {
                if (attr.attribute == "Thickness") {
                    frm.set_value("custom_thickness", attr.attribute_value);
                }
            });
        }
    }
}
