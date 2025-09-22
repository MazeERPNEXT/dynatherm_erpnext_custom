// frappe.ui.form.on('Material Request', {
//     // Triggered when Item Code is selected
//     item_code: function(frm) {
//         if (frm.doc.item_code) {
//             frappe.db.get_doc('Item', frm.doc.item_code).then(item => {
//                 frm.set_value('length', item.length || 0);
//                 frm.set_value('width', item.width || 0);
//                 frm.set_value('thickness', item.thickness || 0);
//                 frm.set_value('kilogramskgs', item.kilogramskgs || 0);
//             });
//         }
//     }
// });
