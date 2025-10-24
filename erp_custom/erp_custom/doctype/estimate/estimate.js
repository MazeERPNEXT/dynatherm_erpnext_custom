// erp_custom/doctype/estimate/estimate.js
// Copyright (c) 2015, Frappe Technologies Pvt. Ltd.
// License: GNU General Public License v3. See license.txt

// -------------------- ERPNext Controller Setup --------------------
if (typeof erpnext !== "undefined" && erpnext) {
	try {
		erpnext.accounts.taxes.setup_tax_validations("Sales Taxes and Charges Template");
		erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
		erpnext.pre_sales.set_as_lost("Estimate");
		erpnext.sales_common.setup_selling_controller();
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

	// Calculate only Estimated BOM Materials total
	if (frm.doc.estimated_bom_materials && Array.isArray(frm.doc.estimated_bom_materials)) {
		frm.doc.estimated_bom_materials.forEach(row => {
			bom_total += safeNumber(row.amount);
		});
	}

	// Set parent total = BOM total only
	const total = Number(bom_total.toFixed(2));
	if (frm.doc.total !== total) {
		frm.set_value("total", total);
		frm.refresh_field("total");
	}

	// Automatically set BOM total → first Estimate Item rate
	update_first_item_rate_only(frm, total);
}

// -------------------- Sync BOM Total to First Item Rate Only --------------------
function update_first_item_rate_only(frm, total) {
	if (!frm.doc.items || frm.doc.items.length === 0) return;

	const first = frm.doc.items[0];
	const cdt = first.doctype || "Estimate Item";
	const cdn = first.name;

	const qty = safeNumber(first.qty) || 1;
	const rate = Number((total / qty).toFixed(2));

	// Set rate only (don’t recalc amount separately)
	frappe.model.set_value(cdt, cdn, "rate", rate);

	// Just refresh UI for clarity
	frm.refresh_field("items");
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

	if (frm.doc.total_net_weight !== total_rounded) {
		frm.set_value("total_net_weight", total_rounded);
		frm.refresh_field("total_net_weight");
	}
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

// -------------------- Child Table Hooks --------------------
frappe.ui.form.on("Estimate Item", {
	rate(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const qty = safeNumber(row.qty);
		const amount = Number((qty * safeNumber(row.rate)).toFixed(2));
		frappe.model.set_value(cdt, cdn, "amount", amount, () => recompute_total(frm));
	},

	qty(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const amount = Number((safeNumber(row.qty) * safeNumber(row.rate)).toFixed(2));
		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
			recompute_total(frm);
			recompute_total_net_weight(frm);
		});
	},

	total_weight(frm, cdt, cdn) {
		recompute_total_net_weight(frm);
	}
});

frappe.ui.form.on("Estimated BOM Materials", {
	amount(frm, cdt, cdn) {
		recompute_total(frm);
	},
	rate(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		row.amount = Number((safeNumber(row.qty) * safeNumber(row.rate)).toFixed(2));
		frm.refresh_field("estimated_bom_materials");
		recompute_total(frm);
	},
	qty(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		row.amount = Number((safeNumber(row.qty) * safeNumber(row.rate)).toFixed(2));
		frm.refresh_field("estimated_bom_materials");
		recompute_total(frm);
	}
});

// -------------------- ERPNext Controller Extension --------------------
if (typeof erpnext !== "undefined" && erpnext) {
	erpnext.selling.QuotationController = class QuotationController extends erpnext.selling.SellingController {
		onload(doc, dt, dn) {
			super.onload(doc, dt, dn);
		}

		refresh(doc, dt, dn) {
			super.refresh(doc, dt, dn);
			this.toggle_reqd_lead_customer && this.toggle_reqd_lead_customer();
		}

		make_sales_order() {
			let has_alt = this.frm.doc.items.some((i) => i.is_alternative);
			if (has_alt) this.show_alternative_items_dialog();
			else
				frappe.model.open_mapped_doc({
					method: "erpnext.selling.doctype.quotation.quotation.make_sales_order",
					frm: this.frm,
				});
		}

		set_dynamic_field_label() {
			if (this.frm.doc.quotation_to == "Customer") {
				this.frm.set_df_property("party_name", "label", "Customer");
				this.frm.fields_dict.party_name.get_query = null;
			} else if (this.frm.doc.quotation_to == "Lead") {
				this.frm.set_df_property("party_name", "label", "Lead");
				this.frm.fields_dict.party_name.get_query = () => ({
					query: "erpnext.controllers.queries.lead_query",
				});
			} else if (this.frm.doc.quotation_to == "Prospect") {
				this.frm.set_df_property("party_name", "label", "Prospect");
				this.frm.fields_dict.party_name.get_query = null;
			}
		}
	};

	cur_frm.script_manager.make(erpnext.selling.QuotationController);
}

// -------------------- Legacy / Optional Hooks --------------------
frappe.ui.form.on("Estimate Item", {
	items_on_form_rendered(frm, cdt, cdn) {},
});

frappe.ui.form.on("Estimate Item", "stock_balance", function (frm, cdt, cdn) {
	var d = frappe.model.get_doc(cdt, cdn);
	frappe.route_options = { item_code: d.item_code };
	frappe.set_route("query-report", "Stock Balance");
});
