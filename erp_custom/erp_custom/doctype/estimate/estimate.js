// erp_custom/doctype/estimate/estimate.js
// Copyright (c) 2015, Frappe Technologies Pvt. Ltd.
// License: GNU General Public License v3. See license.txt

// -------------------- ERPNext Controller Setup --------------------
if (typeof erpnext !== "undefined" && erpnext) {
	try {
		erpnext.accounts.taxes.setup_tax_validations("Sales Taxes and Charges Template");
		erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
		// erpnext.pre_sales.set_as_lost("Estimate");
		// erpnext.sales_common.setup_selling_controller();
	} catch (e) {
		console.warn("erpnext integrations skipped:", e);
	}
}

// -------------------- Helper Functions --------------------
function safeNumber(v) {
	if (v === null || v === undefined || v === "") return 0;
	if (typeof v === "string") v = v.replace(/,/g, "");
	const n = Number(v);
	return isNaN(n) ? 0 : n;
}

// -------------------- Compute Total --------------------
function recompute_total(frm) {
	let bom_total = 0.0;

	if (frm.doc.estimated_bom_materials && Array.isArray(frm.doc.estimated_bom_materials)) {
		frm.doc.estimated_bom_materials.forEach(row => {
			bom_total += safeNumber(row.amount); // amount already includes margin
		});
	}

	const total = Number(bom_total.toFixed(2));
	if (frm.doc.total !== total) {
		frm.set_value("total", total);
		frm.refresh_field("total");
	}

	update_first_item_rate_only(frm, total);
}

// -------------------- Sync BOM Total to First Item Rate Only --------------------
function update_first_item_rate_only(frm, total) {
	if (!frm.doc.items || frm.doc.items.length === 0) return;

	const first = frm.doc.items[0];
	const cdt = first.doctype || "Estimate Item";
	const cdn = first.name;

	const qty = safeNumber(first.qty) || 1;
	const computed_rate = Number((total / qty).toFixed(2));

	// Only override if current rate is less than computed_rate
	const current_rate = safeNumber(first.rate);
	if (current_rate < computed_rate) {
		// set the rate on the first item to computed_rate
		frappe.model.set_value(cdt, cdn, "rate", computed_rate, () => {
			// ensure amount and total are consistent after changing the rate
			const updated_row = locals[cdt][cdn];
			const updated_qty = safeNumber(updated_row.qty) || qty;
			const updated_amount = Number((updated_qty * safeNumber(computed_rate)).toFixed(2));
			frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
				frm.refresh_field("items");
				// recompute total (though recompute_total will be called by amount setter callback)
				recompute_total(frm);
			});
		});
	} else {
		// current rate is equal or greater - do nothing
	}
}

// -------------------- Compute Total Net Weight --------------------
function recompute_total_net_weight(frm) {
	let total = 0.0;

	if (frm.doc.items && Array.isArray(frm.doc.items)) {
		frm.doc.items.forEach(row => {
			const weight =
				row.total_weight !== undefined && row.total_weight !== null && row.total_weight !== ""
					? safeNumber(row.total_weight)
					: safeNumber(row.qty);
			total += weight;
		});
	}

	const total_rounded = Number(total.toFixed(4));

}

// -------------------- Estimate Form Hooks --------------------
frappe.ui.form.on("Estimate", {
	setup(frm) {
		frm.custom_make_buttons = { "Sales Order": "Sales Order" };

		frm.set_query("quotation_to", () => ({
			filters: { name: ["in", ["Customer", "Lead", "Prospect"]] },
		}));

		try {
			frm.set_df_property("packed_items", "cannot_add_rows", true);
			frm.set_df_property("packed_items", "cannot_delete_rows", true);
		} catch (e) {}

		frm.set_indicator_formatter &&
			frm.set_indicator_formatter("item_code", (doc) =>
				!doc.qty && frm.doc.has_unit_price_items ? "yellow" : ""
			);
	},

	refresh(frm) {
		frm.trigger("set_label");
		frm.trigger("set_dynamic_field_label");

		recompute_total(frm);
		recompute_total_net_weight(frm);

		if (frm.doc.docstatus == 1) {
			cur_frm?.page?.set_inner_btn_group_as_primary?.(__("Create"));
		}
	},

	quotation_to(frm) {
		frm.trigger("set_label");
		frm.trigger("toggle_reqd_lead_customer");
		frm.trigger("set_dynamic_field_label");
		frm.set_value("customer_name", "");
	},

	set_label(frm) {
		if (frm.fields_dict && frm.fields_dict.customer_address) {
			frm.fields_dict.customer_address.set_label(__(frm.doc.quotation_to + " Address"));
		}
	},

	estimated_bom_materials_add(frm) {
		recompute_total(frm);
	},
	estimated_bom_materials_remove(frm) {
		recompute_total(frm);
	},

	validate(frm) {
		recompute_total(frm);
		recompute_total_net_weight(frm);
	},

	items_add(frm) {
		recompute_total(frm);
		recompute_total_net_weight(frm);
	},

	items_remove(frm) {
		recompute_total(frm);
		recompute_total_net_weight(frm);
	},
});

// -------------------- Estimate Item Hooks --------------------
// We modify rate handler so that if user edits rate of first item and sets lower than computed minimum, we reject it.
frappe.ui.form.on("Estimate Item", {
	rate(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const qty = safeNumber(row.qty) || 1;
		const entered_rate = safeNumber(row.rate);

		// Determine computed minimum rate from parent total
		const parent_total = safeNumber(frm.doc.total);
		const min_rate = Number((parent_total / qty).toFixed(2));

		// Check if this row is the first item
		const is_first = frm.doc.items && frm.doc.items.length > 0 && frm.doc.items[0].name === cdn;

		if (is_first) {
			if (entered_rate < min_rate) {
				// Show error and revert to min_rate
				frappe.msgprint({
					title: __("Invalid Rate"),
					message: __(
						"Entered rate ({0}) is less than the minimum allowed rate ({1}). Reverting to minimum rate.",
						[entered_rate.toFixed(2), min_rate.toFixed(2)]
					),
					indicator: "red",
				});

				// Set rate to min_rate and update amount
				frappe.model.set_value(cdt, cdn, "rate", min_rate, () => {
					const updated_amount = Number((qty * safeNumber(min_rate)).toFixed(2));
					frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
						frm.refresh_field("items");
						recompute_total(frm);
					});
				});
				return;
			}
		}

		// For non-first or valid entries, update amount normally
		const amount = Number((qty * entered_rate).toFixed(2));
		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
			recompute_total(frm);
		});
	},

	qty(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const amount = Number((safeNumber(row.qty) * safeNumber(row.rate)).toFixed(2));
		// set amount and recompute totals & net weight
		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
			recompute_total(frm);
			recompute_total_net_weight(frm);
		});
	},

	total_weight(frm, cdt, cdn) {
		recompute_total_net_weight(frm);
	}
});

// -------------------- Estimated BOM Materials Hooks --------------------
frappe.ui.form.on("Estimated BOM Materials", {
	rate(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const rate = safeNumber(row.rate);
		const qty = safeNumber(row.qty);
		const margin = safeNumber(row.margin);
		row.amount = Number((qty * rate + margin).toFixed(2)); 
		row.uom = "Kg";

		frm.refresh_field("estimated_bom_materials");
		recompute_total(frm);
	},

	qty(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const rate = safeNumber(row.rate);
		const qty = safeNumber(row.qty);
		const margin = safeNumber(row.margin);
		row.amount = Number((qty * rate + margin).toFixed(2));
		row.uom = "Kg";

		frm.refresh_field("estimated_bom_materials");
		recompute_total(frm);
	},

	margin(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const rate = safeNumber(row.rate);
		const qty = safeNumber(row.qty);
		const margin = safeNumber(row.margin);
		row.amount = Number((qty * rate + margin).toFixed(2));
		row.uom = "Kg";

		frm.refresh_field("estimated_bom_materials");
		recompute_total(frm);
	},

	length: calculate_bom_weight,
	width: calculate_bom_weight,
	thickness: calculate_bom_weight,
	density: calculate_bom_weight,

	estimated_bom_materials_add(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		row.uom = "Kg";
		frappe.model.set_value(cdt, cdn, "margin", 0);
		frappe.model.set_value(cdt, cdn, "amount", 0);
		frm.refresh_field("estimated_bom_materials");
	},
});

// -------------------- Kilogram Calculation Logic --------------------
function calculate_bom_weight(frm, cdt, cdn) {
	let d = locals[cdt][cdn];

	if (d.length && d.width && d.thickness && d.density) {
		let length_m = safeNumber(d.length) / 1000;
		let width_m = safeNumber(d.width) / 1000;
		let thickness_m = safeNumber(d.thickness) / 1000;

		let volume_m3 = length_m * width_m * thickness_m;
		let density_kg_m3 = safeNumber(d.density) * 1000;
		let weight_kg = volume_m3 * density_kg_m3;

		frappe.model.set_value(cdt, cdn, "kilogramskgs", Number(weight_kg.toFixed(4)));
		frappe.model.set_value(cdt, cdn, "qty", Number(weight_kg.toFixed(4)));
		frappe.model.set_value(cdt, cdn, "uom", "Kg");

		frm.refresh_field("estimated_bom_materials");
	} else {
		frappe.model.set_value(cdt, cdn, "kilogramskgs", 0);
		frappe.model.set_value(cdt, cdn, "uom", "Kg");
	}
}

// -------------------- ERPNext Controller Extension --------------------


// -------------------- Legacy / Optional Hooks --------------------
frappe.ui.form.on("Estimate Item", {
	items_on_form_rendered(frm, cdt, cdn) {},
});

frappe.ui.form.on("Estimate Item", "stock_balance", function (frm, cdt, cdn) {
	var d = frappe.model.get_doc(cdt, cdn);
	frappe.route_options = { item_code: d.item_code };
	frappe.set_route("query-report", "Stock Balance");
});
