frappe.ui.form.on("Quotation", {
	onload(frm) {
		if (!frm.is_new()) return;

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
			});
		});

		frm.refresh_field("items");
		localStorage.removeItem("estimate_items_temp");
	},
});
