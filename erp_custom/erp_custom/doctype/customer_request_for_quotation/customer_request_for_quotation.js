// // Copyright (c) 2025, maze and contributors
// // For license information, please see license.txt

frappe.ui.form.on('Customer Request For Quotation', {
    refresh(frm) {
        if (frm.doc.docstatus=="1"){
            frm.add_custom_button(__('Estimate'), function() {
                frappe.set_route('List', 'Estimate');
        }, __("Create"));
        } 
    }
});

