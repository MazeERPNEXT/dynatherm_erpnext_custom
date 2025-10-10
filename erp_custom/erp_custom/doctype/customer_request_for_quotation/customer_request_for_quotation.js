// // Copyright (c) 2025, maze and contributors
// // For license information, please see license.txt

// frappe.ui.form.on('Customer Request For Quotation', {
//     refresh(frm) {
//         if (frm.doc.docstatus=="1"){
//             frm.add_custom_button(__('Estimate'), function() {
//                 frappe.set_route('List', 'Estimate');
//         }, __("Create"));
//         // mark "Create" group as primary 
//         create_btn = frm.page.set_inner_btn_group_as_primary(__('Create'));
//         // apply css to the actual button element
//         $(create_btn).css({
//             'background-color': 'black',
//             'color': 'white'
//         });
//         } 
//     }
// });


frappe.ui.form.on('Customer Request For Quotation', {
    refresh(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Estimate'), function () {
                frappe.model.open_mapped_doc({
                    method: "erp_custom.erp_custom.doctype.customer_request_for_quotation.customer_request_for_quotation.make_estimate",
                    frm: frm
                });
            }, __("Create"));
        }
    }
});



frappe.ui.form.on('Customer Request For Quotation', {
    refresh(frm) {
        // Show the button only after the document is submitted
        if (frm.doc.docstatus === 1) {

            // Add "Estimate" button under "Create" group
            frm.add_custom_button(__('Estimate'), function() {
                frm.events.make_estimate(frm);
            }, __("Create"));

            // Mark the "Create" group as primary and style the button
            const create_btn = frm.page.set_inner_btn_group_as_primary(__('Create'));
            $(create_btn).css({
                'background-color': 'black',
                'color': 'white',
                'font-weight': 'bold'
            });
        }
    },

    // Function to create Estimate from CRFQ
    make_estimate: function(frm) {
        frappe.model.open_mapped_doc({
            method: "erp_custom.erp_custom.doctype.customer_request_for_quotation.customer_request_for_quotation.make_estimate",
            frm: frm,
            run_link_triggers: true,
        });
    }
});
