
// frappe.ui.form.on('Project', {
//     refresh(frm) {

//         // Show button only if document is submitted
//         if (frm.doc.docstatus === 1) {

//             frm.add_custom_button('Quality Assurance Plan', () => {

//                 // Open new QAP form with mapped values
//                 frappe.new_doc('Quality Assurance Plan', {
//                     project: frm.doc.project_name
//                 });

//             }, 'Create');

//         }
//     }
// });


// frappe.ui.form.on('Project', {
//     refresh(frm) {

//         if (!frm.is_new()) {
//             frm.add_custom_button(__('Bill of Materials'), () => {
//                 frappe.new_doc('BOM', {
//                     project: frm.doc.name  
//             });
//             }, __('Create'));
//             frm.add_custom_button('Quality Assurance Plan', () => {
//                 frappe.new_doc('Quality Assurance Plan', {
//                     project: frm.doc.project_name
//                 });
//             }, 'Create');
//         }
//     }
// });







frappe.ui.form.on('Project', {
    onload(frm) {
        // ✅ Auto set Financial Year only if empty
        if (!frm.doc.custom_financial_year) {

            frappe.call({
                method: "erpnext.accounts.utils.get_fiscal_year",
                args: {
                    date: frm.doc.expected_start_date || frappe.datetime.get_today()
                },
                callback: function(r) {
                    if (r.message) {
                        frm.set_value("custom_financial_year", r.message[0]);
                    }
                }
            });

        }
    },

    refresh(frm) {
        if (frm.is_new()) return;

        // ✅ BOM
        frm.add_custom_button(__('Bill of Materials'), () => {
            frappe.new_doc('BOM', {
                project: frm.doc.name
            });
        }, __('Create'));

        // ✅ QAP
        frm.add_custom_button(__('Quality Assurance Plan'), () => {
            frappe.new_doc('Quality Assurance Plan', {
                project: frm.doc.name   
            });
        }, __('Create'));

    }
});



// frappe.ui.form.on('Project', {
//     onload(frm) {
//         // ✅ Auto set Financial Year only if empty
//         if (!frm.doc.custom_financial_year) {
//             frappe.call({
//                 method: "erpnext.accounts.utils.get_fiscal_year",
//                 args: {
//                     date: frm.doc.expected_start_date || frappe.datetime.get_today()
//                 },
//                 callback: function(r) {
//                     if (r.message) {
//                         frm.set_value("custom_financial_year", r.message[0]);
//                     }
//                 }
//             });
//         }
//     },

//     refresh(frm) {
//         if (frm.is_new()) return;

//         // ✅ BOM
//         frm.add_custom_button(__('Bill of Materials'), () => {
//             frappe.new_doc('BOM', {
//                 project: frm.doc.name
//             });
//         }, __('Create'));

//         // ✅ QAP
//         frm.add_custom_button(__('Quality Assurance Plan'), () => {
//             frappe.new_doc('Quality Assurance Plan', {
//                 project: frm.doc.name   
//             });
//         }, __('Create'));
//     },

//     // ✅ Validate before save (prevent duplicates)
//     validate(frm) {
//         let seen = new Set();

//         (frm.doc.certificates || []).forEach(row => {
//             if (row.certificate_type) {
//                 if (seen.has(row.certificate_type)) {
//                     frappe.throw(`Duplicate Certificate: ${row.certificate_type}`);
//                 }
//                 seen.add(row.certificate_type);
//             }
//         });
//     }
// });


// // ✅ Child table logic
// frappe.ui.form.on('Project Certificate', {

//     certificate_type(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];

//         if (!row.certificate_type) return;

//         // 🔍 Check duplicate immediately while selecting
//         let duplicates = frm.doc.certificates.filter(r =>
//             r.certificate_type === row.certificate_type
//         );

//         if (duplicates.length > 1) {
//             frappe.msgprint(`Already selected: ${row.certificate_type}`);
//             frappe.model.set_value(cdt, cdn, "certificate_type", "");
//         }
//     }
// });