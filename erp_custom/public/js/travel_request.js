//Update the total amount based on sponsored and funded amount
frappe.ui.form.on("Travel Request Costing", {
    sponsored_amount: function (frm, cdt, cdn) {
        calculate_total(cdt, cdn);
    },
    funded_amount: function (frm, cdt, cdn) {
        calculate_total(cdt, cdn);
    }
    
});

function calculate_total(cdt, cdn) {
    let row = locals[cdt][cdn];

    let sponsored = row.sponsored_amount || 0;
    let funded = row.funded_amount || 0;

    row.total_amount = sponsored + funded;

    refresh_field("total_amount", cdn, "costings");
}
// update total amount to overal total bills
frappe.ui.form.on("Travel Request", {
    refresh(frm) {
        calculate_total_trip_bills(frm);
        if(frm.doc.docstatus == "1"){
            frm.add_custom_button(__("Employee Advance"),
             () => frm.events.make_advance_payment(frm),
            __("Create"));
        }
    },
    // map travel expence to employee payment
    make_advance_payment:function(frm){
        frappe.model.open_mapped_doc({
			method: "erp_custom.travel_request.make_tr_to_empoladvance",
			frm: frm,
			run_link_triggers: true,
		});
    }
});

function calculate_total_trip_bills(frm) {
    let total = 0;

    (frm.doc.costings || []).forEach(row => {
        total += flt(row.total_amount);
    });

    frm.set_value("custom_total_trip_bills", total);
}
