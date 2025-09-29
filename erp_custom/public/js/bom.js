frappe.ui.form.on('BOM', {
    validate: function(frm) {
        calculate_weight(frm);
    },

    custom_length: function(frm) {
        calculate_weight(frm);
    },
    custom_width: function(frm) {
        calculate_weight(frm);
    },
    custom_thickness: function(frm) {
        calculate_weight(frm);
    },
    custom_density: function(frm) {
        calculate_weight(frm);
    }
});

function calculate_weight(frm) {
    if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness && frm.doc.custom_density) {
        let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * frm.doc.custom_density) / 1000000;
        let final_weight = weight.toFixed(2);

        frm.set_value("custom_kilogramskgs", final_weight);
    } else {
        frm.set_value("custom_kilogramskgs", 0);
    }
}
