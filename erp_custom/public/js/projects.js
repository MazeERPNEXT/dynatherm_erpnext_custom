
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

        // ✅ QAP Button
        frm.add_custom_button(__('Quality Assurance Plan'), () => {
             frappe.new_doc('Quality Assurance Plan', {}, (qap) => {

        // ✅ Parent Fields
        qap.project = frm.doc.name;
        qap.sales_order_no = frm.doc.project_name;
        qap.date = frm.doc.expected_start_date;
        qap.customer = frm.doc.customer;
        qap.purchase_order_date = frm.doc.expected_start_date;
        qap.sales_order_no = frm.doc.sales_order;

        // ✅ Child Table Mapping
        let row = (frm.doc.custom_project_detail || [])[0];

        if (row) {
            qap.item_code = row.item_code;
            qap.item_name = row.item_name;
            qap.qty = row.qty;
            qap.tag_no = row.tag_no;
        }
    });

    }, __('Create'));

        fetch_cutting_plans(frm);
    }
});

// frappe.ui.form.on('Project Item', {
// });

function fetch_cutting_plans(frm) {

    frappe.call({
        method: "erp_custom.erp_custom.doctype.cutting_plan.cutting_plan.get_cutting_plans",
        args: {
            project: frm.doc.name
        },
        callback: function(r) {

            if (r.message) {

                // ✅ Clear old data
                frm.clear_table("custom_cutting_plan_project");

                r.message.forEach(d => {
                    let row = frm.add_child("custom_cutting_plan_project");

                    row.cutting_plan_no = d.cutting_plan_no;
                    row.date = d.date;
                });

                frm.refresh_field("custom_cutting_plan_project");
            }
        }
    });
}