// Copyright (c) 2025, maze and contributors
// For license information, please see license.txt

frappe.ui.form.on("Estimate", {
    refresh(frm) {
        if (frm.doc.docstatus=="1"){
            frm.add_custom_button(__('Quotation'), function() {
                frappe.set_route('List', 'Quotation');
        }, __("Create"));
        } 
    }
});
