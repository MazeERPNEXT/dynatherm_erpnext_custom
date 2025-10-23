// erp_custom/doctype/estimate/estimate.js
// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

// Keep ERPNext controller setup (these rely on global erpnext namespace)
erpnext.accounts.taxes.setup_tax_validations("Sales Taxes and Charges Template");
erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
erpnext.pre_sales.set_as_lost("Estimate");
erpnext.sales_common.setup_selling_controller();

frappe.ui.form.on("Estimate", {
	setup: function (frm) {
		frm.custom_make_buttons = {
			"Sales Order": "Sales Order",
		};

		frm.set_query("quotation_to", function () {
			return {
				filters: {
					name: ["in", ["Customer", "Lead", "Prospect"]],
				},
			};
		});

		// packed_items property (if present)
		frm.set_df_property("packed_items", "cannot_add_rows", true);
		frm.set_df_property("packed_items", "cannot_delete_rows", true);

		// Indicator formatter example (keeps original behaviour)
		frm.set_indicator_formatter("item_code", function (doc) {
			return !doc.qty && frm.doc.has_unit_price_items ? "yellow" : "";
		});
	},

	refresh: function (frm) {
		// preserve existing label/dynamic behaviour
		frm.trigger("set_label");
		frm.trigger("set_dynamic_field_label");

		// Recompute totals on refresh so Draft view also shows values
		recompute_total(frm);
		recompute_total_net_weight(frm);
	},

	quotation_to: function (frm) {
		frm.trigger("set_label");
		frm.trigger("toggle_reqd_lead_customer");
		frm.trigger("set_dynamic_field_label");
		frm.set_value("customer_name", "");
	},

	set_label: function (frm) {
		if (frm.fields_dict && frm.fields_dict.customer_address) {
			frm.fields_dict.customer_address.set_label(__(frm.doc.quotation_to + " Address"));
		}
	},

	// Child table add/remove events for estimated_bom_materials
	estimated_bom_materials_add: function (frm, cdt, cdn) {
		recompute_total(frm);
	},
	estimated_bom_materials_remove: function (frm, cdt, cdn) {
		recompute_total(frm);
	},

	// When parent is being saved/validated, ensure totals are correct
	validate: function (frm) {
		recompute_total(frm);
		recompute_total_net_weight(frm);
	}
});


function recompute_total(frm) {
	let total = 0.0;

	if (frm.doc.estimated_bom_materials && frm.doc.estimated_bom_materials.length) {
		frm.doc.estimated_bom_materials.forEach(row => {
			// row.amount should be numeric; safely coerce
			total += Number(row.amount) || 0;
		});
	}

	// round to 2 decimals
	const total_rounded = Number(total.toFixed(2));

	// only set & refresh if value changed (minimize churn)
	if (frm.doc.total !== total_rounded) {
		frm.set_value('total', total_rounded);
		frm.refresh_field('total');
	}
}

function recompute_total_net_weight(frm) {
	let total = 0.0;

	if (frm.doc.items && frm.doc.items.length) {
		frm.doc.items.forEach(row => {
			const item_weight = (row.total_weight !== undefined && row.total_weight !== null)
				? Number(row.total_weight)
				: Number(row.qty || 0);
			total += (isNaN(item_weight) ? 0 : item_weight);
		});
	}

	const total_rounded = Number(total.toFixed(4));

	if (frm.doc.total_net_weight !== total_rounded) {
		frm.set_value('total_net_weight', total_rounded);
		frm.refresh_field('total_net_weight');
	}
}


frappe.ui.form.on("Estimated BOM Materials", {
	amount: function(frm, cdt, cdn) {
		recompute_total(frm);
	}
});

frappe.ui.form.on("Estimate Item", {
	total_weight: function(frm, cdt, cdn) {
		recompute_total_net_weight(frm);
	},
	qty: function(frm, cdt, cdn) {
		recompute_total_net_weight(frm);
	}
});


erpnext.selling.QuotationController = class QuotationController extends erpnext.selling.SellingController {
	onload(doc, dt, dn) {
		super.onload(doc, dt, dn);
	}
	party_name() {
		var me = this;
		erpnext.utils.get_party_details(this.frm, null, null, function () {
			me.apply_price_list();
		});

		if (me.frm.doc.quotation_to == "Lead" && me.frm.doc.party_name) {
			me.frm.trigger("get_lead_details");
		}
	}
	refresh(doc, dt, dn) {
		super.refresh(doc, dt, dn);
		frappe.dynamic_link = {
			doc: this.frm.doc,
			fieldname: "party_name",
			doctype: doc.quotation_to,
		};

		var me = this;

		if (doc.__islocal && !doc.valid_till) {
			if (frappe.boot.sysdefaults.quotation_valid_till) {
				this.frm.set_value(
					"valid_till",
					frappe.datetime.add_days(
						doc.transaction_date,
						frappe.boot.sysdefaults.quotation_valid_till
					)
				);
			} else {
				this.frm.set_value("valid_till", frappe.datetime.add_months(doc.transaction_date, 1));
			}
		}

		if (doc.docstatus == 1 && !["Lost", "Ordered"].includes(doc.status)) {
			if (
				frappe.model.can_create("Sales Order") &&
				(frappe.boot.sysdefaults.allow_sales_order_creation_for_expired_quotation ||
					!doc.valid_till ||
					frappe.datetime.get_diff(doc.valid_till, frappe.datetime.get_today()) >= 0)
			) {
				this.frm.add_custom_button(__("Sales Order"), () => this.make_sales_order(), __("Create"));
			}

			if (doc.status !== "Ordered" && this.frm.has_perm("write")) {
				this.frm.add_custom_button(__("Set as Lost"), () => {
					this.frm.trigger("set_as_lost_dialog");
				});
			}

			cur_frm.page.set_inner_btn_group_as_primary(__("Create"));
		}

		if (this.frm.doc.docstatus === 0 && frappe.model.can_read("Opportunity")) {
			this.frm.add_custom_button(
				__("Opportunity"),
				function () {
					erpnext.utils.map_current_doc({
						method: "erpnext.crm.doctype.opportunity.opportunity.make_quotation",
						source_doctype: "Opportunity",
						target: me.frm,
						setters: [
							{
								label: "Party",
								fieldname: "party_name",
								fieldtype: "Link",
								options: me.frm.doc.quotation_to,
								default: me.frm.doc.party_name || undefined,
							},
							{
								label: "Opportunity Type",
								fieldname: "opportunity_type",
								fieldtype: "Link",
								options: "Opportunity Type",
								default: me.frm.doc.order_type || undefined,
							},
						],
						get_query_filters: {
							status: ["not in", ["Lost", "Closed"]],
							company: me.frm.doc.company,
						},
					});
				},
				__("Get Items From"),
				"btn-default"
			);
		}

		this.toggle_reqd_lead_customer();
	}

	make_sales_order() {
		var me = this;

		let has_alternative_item = this.frm.doc.items.some((item) => item.is_alternative);
		if (has_alternative_item) {
			this.show_alternative_items_dialog();
		} else {
			frappe.model.open_mapped_doc({
				method: "erpnext.selling.doctype.quotation.quotation.make_sales_order",
				frm: me.frm,
			});
		}
	}

	set_dynamic_field_label() {
		if (this.frm.doc.quotation_to == "Customer") {
			this.frm.set_df_property("party_name", "label", "Customer");
			this.frm.fields_dict.party_name.get_query = null;
		} else if (this.frm.doc.quotation_to == "Lead") {
			this.frm.set_df_property("party_name", "label", "Lead");
			this.frm.fields_dict.party_name.get_query = function () {
				return { query: "erpnext.controllers.queries.lead_query" };
			};
		} else if (this.frm.doc.quotation_to == "Prospect") {
			this.frm.set_df_property("party_name", "label", "Prospect");
			this.frm.fields_dict.party_name.get_query = null;
		}
	}

	toggle_reqd_lead_customer() {
		var me = this;

		this.frm.toggle_reqd("party_name", this.frm.doc.quotation_to);
		this.frm.set_query("customer_address", this.address_query);
		this.frm.set_query("shipping_address_name", this.address_query);
	}

	tc_name() {
		this.get_terms();
	}

	address_query(doc) {
		return {
			query: "frappe.contacts.doctype.address.address.address_query",
			filters: {
				link_doctype: frappe.dynamic_link.doctype,
				link_name: doc.party_name,
			},
		};
	}
};

cur_frm.script_manager.make(erpnext.selling.QuotationController);

// small hooks for legacy events (no-op placeholders)
frappe.ui.form.on("Estimate Item", {
	items_on_form_rendered: function (frm, cdt, cdn) {
		// optional: logic for item table rendering
	}
});

frappe.ui.form.on("Estimate Item", "stock_balance", function (frm, cdt, cdn) {
	var d = frappe.model.get_doc(cdt, cdn);
	frappe.route_options = { item_code: d.item_code };
	frappe.set_route("query-report", "Stock Balance");
});
