// Copyright (c) 2025, maze and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Estimate", {
//     refresh(frm) {
//         if (frm.doc.docstatus=="1"){
//             frm.add_custom_button(__('Quotation'), function() {
//                 frappe.set_route('List', 'Quotation');
//         }, __("Create"));
//          // mark "Create" group as primary 
//         create_btn = frm.page.set_inner_btn_group_as_primary(__('Create'));
//         // apply css to the actual button element
//         $(create_btn).css({
//             'background-color': 'black',
//             'color': 'white'
//         });
//         } 
//     }
// });




// frappe.ui.form.on('Estimate', {
//     refresh(frm) {
//         if (frm.doc.docstatus === 1) {
//             frm.add_custom_button(__('Quotation'), function () {
//                 frappe.model.open_mapped_doc({
//                     method: "erp_custom.erp_custom.doctype.estimate.estimate.make_quotation",
//                     frm: frm
//                 });
//             }, __("Create"));
//         }
//     }
// });



// frappe.ui.form.on('Estimate', {
//     refresh(frm) {
//         // Show the button only after the document is submitted
//         if (frm.doc.docstatus === 1) {

//             // Add "Estimate" button under "Create" group
//             frm.add_custom_button(__('Estimate'), function() {
//                 frm.events.make_quotation(frm);
//             }, __("Create"));

//             // Mark the "Create" group as primary and style the button
//             const create_btn = frm.page.set_inner_btn_group_as_primary(__('Create'));
//             $(create_btn).css({
//                 'background-color': 'black',
//                 'color': 'white',
//                 'font-weight': 'bold'
//             });
//         }
//     },

//     // Function to create Estimate from CRFQ
//     make_quotation: function(frm) {
//         frappe.model.open_mapped_doc({
//             method: "erp_custom.erp_custom.doctype.estimate.estimate.make_quotation",
//             frm: frm,
//             run_link_triggers: true,
//         });
//     }
// });



frappe.ui.form.on('Estimate', {
    refresh(frm) {
        if (frm.doc.docstatus === 1) {
            // Show only "Quotation" button
            frm.add_custom_button(__('Quotation'), function () {
                frappe.model.open_mapped_doc({
                    method: "erp_custom.erp_custom.doctype.estimate.estimate.make_quotation",
                    frm: frm
                });
            }, __("Create"));

            // Style the button
            const create_btn = frm.page.set_inner_btn_group_as_primary(__('Create'));
            $(create_btn).css({
                'background-color': 'black',
                'color': 'white',
                'font-weight': 'bold'
            });
        }
    }
});



// frappe.ui.form.on('Estimate', {
//     validate: function(frm) {
//         let total_weight = 0;

//         // Calculate each item’s weight
//         if (frm.doc.items && frm.doc.items.length > 0) {
//             frm.doc.items.forEach(row => {
//                 if (row.length && row.width && row.thickness && row.density) {
//                     // formula: (L * W * T * Density) / 1,000,000  (assuming mm & g/cm³ units)
//                     row.quantity = (row.length * row.width * row.thickness * row.density) / 1000000;
//                 } else {
//                     row.quantity = 0;
//                 }

//                 total_weight += flt(row.quantity);
//             });
//         }

//         // Set total weight on Estimate
//         frm.set_value("total_weight", flt(total_weight, 2));
//         frm.refresh_field("items");
//     }
// });
