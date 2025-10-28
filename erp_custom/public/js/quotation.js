frappe.ui.form.on("Quotation", {
	onload(frm) {

		const estimate_items = JSON.parse(localStorage.getItem("estimate_items_temp") || "[]");
		if (!estimate_items.length) return;

		frm.clear_table("items");

		estimate_items.forEach((item) => {
			let row = frm.add_child("items", {
				item_code: item.item_code,
				item_name: item.item_name,
				qty: item.qty,
				uom: item.uom,
				rate: item.rate,
				amount: item.amount,
				description: item.description,
				estimate_rate: item.rate,
			});
		});

		frm.refresh_field("items");
		localStorage.removeItem("estimate_items_temp");
	},
});

// -------------------- Rate Validation --------------------
frappe.ui.form.on("Quotation Item", {
	rate(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		const new_rate = flt(row.rate);
		const estimate_rate = flt(row.estimate_rate);

		if (estimate_rate && new_rate < estimate_rate) {
			frappe.msgprint({
				title: __("Invalid Rate"),
				message: __(
					"Rate ({0}) cannot be less than Estimate Rate ({1}). Please increase it.",
					[new_rate, estimate_rate]
				),
				indicator: "red",
			});
			frappe.model.set_value(cdt, cdn, "rate", estimate_rate);
		}
	},
});
