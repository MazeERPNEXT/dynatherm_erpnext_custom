// erp_custom/doctype/estimate/estimate.js
// Copyright (c) 2015,
// Frappe Technologies Pvt. Ltd.
// License: GNU General Public License v3. See license.txt


// -------------------- ERPNext Controller Setup --------------------
if (typeof erpnext !== "undefined" && erpnext) {
	try {
		erpnext.accounts.taxes.setup_tax_validations("Sales Taxes and Charges Template");
		erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
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
			bom_total += safeNumber(row.amount);
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

	const current_rate = safeNumber(first.rate);
	if (current_rate < computed_rate) {
		frappe.model.set_value(cdt, cdn, "rate", computed_rate, () => {
			const updated_row = locals[cdt][cdn];
			const updated_qty = safeNumber(updated_row.qty) || qty;
			const updated_amount = Number((updated_qty * safeNumber(computed_rate)).toFixed(2));
			frappe.model.set_value(cdt, cdn, "amount", updated_amount, () => {
				frm.refresh_field("items");
				recompute_total(frm);
			});
		});
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
	// -------------------- Auto Fetch Default BOM --------------------
	finished_goods(frm) {
		if (!frm.doc.finished_goods) return;

		frappe.db.get_value("Item", frm.doc.finished_goods, "default_bom", (r) => {
			if (r && r.default_bom) {
				frm.set_value("bom", r.default_bom);
			} else {
				frappe.msgprint(__("No Default BOM found for this Finished Goods item."));
				frm.set_value("bom", "");
			}
		});
	},

	// -------------------- Fetch BOM Items into Estimated BOM Materials --------------------
	get_items_from_bom(frm) {
		if (!frm.doc.bom) {
			frappe.msgprint(__("Please select a BOM first."));
			return;
		}

		frappe.call({
			method: "frappe.client.get",
			args: { doctype: "BOM", name: frm.doc.bom },
			callback: function (r) {
				if (!r.message) {
					frappe.msgprint(__("BOM not found."));
					return;
				}

				const bom = r.message;
				if (!bom.items || bom.items.length === 0) {
					frappe.msgprint(__("No items found in the selected BOM."));
					return;
				}

				// Avoid duplicate entries
				const existing_items = new Set(
					(frm.doc.estimated_bom_materials || []).map(row => row.item_code)
				);

				let added = 0;
				bom.items.forEach((bom_item) => {
					if (existing_items.has(bom_item.item_code)) return; // skip duplicates

					let row = frm.add_child("estimated_bom_materials");
					row.item_code = bom_item.item_code;
					row.item_name = bom_item.item_name;
					row.length = bom_item.custom_length || 0;
					row.width = bom_item.custom_width || 0;
					row.thickness = bom_item.custom_thickness || 0;
					row.density = bom_item.custom_density || 0;
					row.kilogramskgs = bom_item.custom_kilogramskgs || 0;
					row.qty = bom_item.qty || 1;
					row.uom = bom_item.uom || "Nos";

					existing_items.add(bom_item.item_code);
					added++;
				});

				if (added > 0) {
					frappe.msgprint(__("{0} new item(s) added from BOM.", [added]));
				} else {
					frappe.msgprint(__("All BOM items already exist — no duplicates added."));
				}

				frm.refresh_field("estimated_bom_materials");
			},
		});
	},

	// -------------------- Create Quotation Button after Submission --------------------
	refresh(frm) {
		if (frm.doc.docstatus === 1) {
			cur_frm?.page?.set_inner_btn_group_as_primary?.(__("Create"));

			frm.add_custom_button(__('Quotation'), function() {
				// Step 1: Check if a Quotation already exists for this Estimate
				frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Quotation",
						filters: {
							custom_crfq__tender_id: frm.doc.crfq__tender_id
						},
						fields: ["name"],
						limit: 1
					},
					callback: function (r) {
						if (r.message && r.message.length > 0) {
							// ✅ Quotation already exists, open it directly
							let existing_quotation = r.message[0].name;
							frappe.msgprint(__("Quotation already exists for this Estimate. Opening it."));
							frappe.set_route("Form", "Quotation", existing_quotation);
							return;
						}

						// Step 2: No Quotation found, create new one
						frappe.route_options = {
							valid_till: frm.doc.valid_till,
							total: frm.doc.total,
							party_name: frm.doc.customer_name,
							custom_crfq__tender_id: frm.doc.crfq__tender_id || "",
						};

						const estimate_items = (frm.doc.items || [])
							.filter(row => row.item_code)
							.map(row => ({
								item_code: row.item_code,
								item_name: row.item_name,
								qty: row.qty,
								uom: row.uom,
								description: row.description,
								rate: row.rate,
								amount: row.amount,
							}));

						if (!estimate_items.length) {
							frappe.msgprint(__("No valid items found to create a Quotation."));
							return;
						}

						localStorage.setItem("estimate_items_temp", JSON.stringify(estimate_items));
						frappe.set_route('Form', 'Quotation', 'new-quotation');
					}
				});
			}, __('Create'));
		}
	},
});


// -------------------- Estimate Item Hooks --------------------
frappe.ui.form.on("Estimate Item", {
	item_code(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const item_code = row.item_code;

		if (!item_code) return;

		frappe.db.get_value("Item", item_code, ["item_name"], (value) => {
			if (value && value.item_name) {
				frappe.model.set_value(cdt, cdn, "item_name", value.item_name);
			}
		});
	},

	rate(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const qty = safeNumber(row.qty) || 1;
		const entered_rate = safeNumber(row.rate);

		const parent_total = safeNumber(frm.doc.total);
		const min_rate = Number((parent_total / qty).toFixed(2));

		const is_first = frm.doc.items && frm.doc.items.length > 0 && frm.doc.items[0].name === cdn;

		if (is_first) {
			if (entered_rate < min_rate) {
				frappe.msgprint({
					title: __("Invalid Rate"),
					message: __(
						"Entered rate ({0}) is less than the minimum allowed rate ({1}). Reverting to minimum rate.",
						[entered_rate.toFixed(2), min_rate.toFixed(2)]
					),
					indicator: "red",
				});

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

		const amount = Number((qty * entered_rate).toFixed(2));
		frappe.model.set_value(cdt, cdn, "amount", amount, () => {
			recompute_total(frm);
		});
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

// -------------------- Estimated BOM Materials Hooks --------------------
frappe.ui.form.on("Estimated BOM Materials", {
	rate: compute_bom_amount,
	qty: compute_bom_amount,
	margin: compute_bom_amount,

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


// Fixed Margin Logic (percentage-based)
function compute_bom_amount(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	const rate = safeNumber(row.rate);
	const qty = safeNumber(row.qty);
	const margin = safeNumber(row.margin); // % value

	const base_amount = qty * rate;
	const margin_amount = base_amount * (margin / 100.0);
	row.amount = Number((base_amount + margin_amount).toFixed(2));

	row.uom = "Kg";
	frm.refresh_field("estimated_bom_materials");
	recompute_total(frm);
}


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

// -------------------- Estimated Operation --------------------
frappe.ui.form.on('Estimated Operation', {
    estimate_qty: function(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },
    estimate_rate: function(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },
    estimate_margin: function(frm, cdt, cdn) {
        apply_margin(frm, cdt, cdn);
    }
});

function calculate_amount(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let qty = flt(row.estimate_qty);
    let rate = flt(row.estimate_rate);

    let amount = qty * rate;
    frappe.model.set_value(cdt, cdn, 'estimate_amount', amount);
}

function apply_margin(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let qty = flt(row.estimate_qty);
    let rate = flt(row.estimate_rate);
    let margin = flt(row.estimate_margin);

    let base_amount = qty * rate;
    let total_amount = base_amount + (base_amount * (margin / 100.0));

    frappe.model.set_value(cdt, cdn, 'estimate_amount', total_amount);
}
