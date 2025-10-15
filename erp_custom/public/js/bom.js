// frappe.ui.form.on('BOM', {
//     validate: function(frm) {
//         if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness && frm.doc.custom_density) {
//             let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * frm.doc.custom_density) / 1000000;
//             let final_weight = flt(weight, 2);

//             frm.set_value("custom_kilogramskgs", final_weight);

//             // Commented: not needed now
//             // frm.set_value("weight_per_unit", final_weight);
//             // frm.set_value("custom_weight_per_unit", final_weight);
//             // frm.set_value("weight_uom", "Kg");
//             // frm.set_value("custom_weight_uom", "Kg");
//         } else {
//             frm.set_value("custom_kilogramskgs", 0);

//             // Commented: not needed now
//             // frm.set_value("weight_per_unit", 0);
//             // frm.set_value("custom_weight_per_unit", 0);
//             // frm.set_value("weight_uom", "Kg");
//             // frm.set_value("custom_weight_uom", "Kg");
//         }


//         if (frm.doc.items && frm.doc.items.length > 0) {
//             frm.doc.items.forEach(row => {
//                 row.qty = frm.doc.custom_kilogramskgs || 0;
//                 row.uom = "Kg";
//             });
//             frm.refresh_field("items");
//         }
//     },


//     custom_kilogramskgs: function(frm) {
//         if (frm.doc.items && frm.doc.items.length > 0) {
//             frm.doc.items.forEach(row => {
//                 row.qty = frm.doc.custom_kilogramskgs || 0;
//                 row.uom = "Kg"; 
//             });
//             frm.refresh_field("items");
//         }
//     }
// });







// frappe.ui.form.on('BOM Item', {
//     items_add: function(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         row.qty = frm.doc.custom_kilogramskgs || 0;
//         row.uom = "Kg"; 
//         frm.refresh_field("items");
//     },
//     custom_length: calculate_kgs,
//     custom_width: calculate_kgs,
//     custom_thickness: calculate_kgs,
//     custom_density: calculate_kgs
// });

// function calculate_kgs(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     if (row.custom_length && row.custom_width && row.custom_thickness && row.custom_density) {
//         let weight = (row.custom_length * row.custom_width * row.custom_thickness * row.custom_density) / 1000000;
//         frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', flt(weight, 2));
//     } else {
//         frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', 0);
//     }
// }








frappe.ui.form.on('BOM Item', {
    items_add: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        row.qty = row.custom_kilogramskgs || 0;
        row.uom = "Kg"; 
        frm.refresh_field("items");
    },
    custom_length: calculate_kgs,
    custom_width: calculate_kgs,
    custom_thickness: calculate_kgs,
    custom_density: calculate_kgs
});

function calculate_kgs(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    let length = parseFloat(row.custom_length) || 0;
    let width = parseFloat(row.custom_width) || 0;
    let thickness = parseFloat(row.custom_thickness) || 0;
    let density = parseFloat(row.custom_density) || 0;

    let weight = 0;

    if (length && width && thickness && density) {
        weight = (length * width * thickness * density) / 1000000;
        weight = flt(weight, 2);
    }

    frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', weight);

    frappe.model.set_value(cdt, cdn, 'qty', weight);
    // frappe.model.set_value(cdt, cdn, 'qty', Math.round(weight));
    frappe.model.set_value(cdt, cdn, 'uom', "Kg");

    frm.refresh_field("items");
}

