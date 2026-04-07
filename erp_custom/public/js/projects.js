
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

//         // ✅ QAP (QAP : Project)
//         frm.add_custom_button(__('Quality Assurance Plan'), () => {
//             frappe.new_doc('Quality Assurance Plan', {
//                 project: frm.doc.name,
//                 customer: frm.doc.customer,
//                 purchase_order_date: frm.doc.expected_start_date,
//             });
//         }, __('Create'));

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

        // ✅ BOM Button
        frm.add_custom_button(__('Bill of Materials'), () => {
            frappe.new_doc('BOM', {
                project: frm.doc.name
            });
        }, __('Create'));

        // ✅ QAP Button (WORKING)
        frm.add_custom_button(__('Quality Assurance Plan'), () => {

            frappe.new_doc('Quality Assurance Plan', {}, (qap) => {

                // ✅ Parent Fields
                qap.project = frm.doc.name;
                qap.customer = frm.doc.customer;
                qap.purchase_order_date = frm.doc.expected_start_date;

                // ✅ Clear child table (safety)
                qap.project_item = [];

                // ✅ Map Child Table
                (frm.doc.custom_project_detail || []).forEach(row => {

                    let child = frappe.model.add_child(
                        qap,
                        'Project Item',      // Child Doctype Name
                        'project_item'       // Fieldname in QAP
                    );

                    child.item_code = row.item_code;
                    child.item_name = row.item_name;
                    // child.custom_tag_no = row.tag_no;
                    child.tag_no = row.custom_tag_no;
                    child.qty = row.qty;

                });

            });

        }, __('Create'));
    }
});