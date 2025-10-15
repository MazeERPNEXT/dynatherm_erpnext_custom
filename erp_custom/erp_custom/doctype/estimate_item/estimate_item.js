// frappe.ui.form.on('Estimate Item', {
//     length: calculate_quantity,
//     width: calculate_quantity,
//     thickness: calculate_quantity,
//     density: calculate_quantity
// });

// function calculate_quantity(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];
    
//     if (row.length && row.width && row.thickness && row.density) {
//         row.quantity = (row.length * row.width * row.thickness * row.density) / 1000000;
//     } else {
//         row.quantity = 0;
//     }

//     frm.refresh_field("items");

//     // Also update parent total_weight dynamically
//     let total = 0;
//     frm.doc.items.forEach(i => total += flt(i.quantity));
//     frm.set_value("total_weight", flt(total, 2));
// }
