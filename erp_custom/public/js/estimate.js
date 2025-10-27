// frappe.ui.form.on('Estimate', {
//     validate: function(frm) {
//         recompute_total_net_weight(frm);
//     },

//     items_on_form_render: function(frm, cdt, cdn) {
//     }
// });

// function recompute_total_net_weight(frm) {
//     let total = 0.0;

//     if (frm.doc.items && frm.doc.items.length) {
//         frm.doc.items.forEach(r => {
//             const q = Number(r.quantity) || 0;
//             total += q;
//         });
//     }

//     const total_rounded = Number(total.toFixed(4));

//     frm.set_value('total_net_weight', total_rounded);
//     frm.refresh_field('total_net_weight');
// }
    

