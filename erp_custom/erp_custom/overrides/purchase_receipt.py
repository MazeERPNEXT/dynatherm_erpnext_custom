import frappe
from frappe import _
from frappe.utils import flt
from erpnext.stock.doctype.purchase_receipt.purchase_receipt import (
    make_purchase_invoice as core_make_purchase_invoice
)
from math import pi

@frappe.whitelist()
def recalculate_pr(docname):
    pr = frappe.get_doc("Purchase Receipt", docname)

    for item in pr.items:
        calculate_item(item)

    pr.save(ignore_permissions=True)
    return True


def calculate_item(item):
    density = flt(item.custom_density)
    qty = flt(item.qty)

    if not density:
        reset_item(item)
        return

    base_weight = 0

    # Plates
    if item.item_group == "Plates":
        base_weight = (
            flt(item.custom_length)
            * flt(item.custom_width)
            * flt(item.custom_thickness)
            * density
        ) / 1_000_000

    # Tubes / Pipes
    elif item.item_group in ("Tubes", "Pipes"):
        R = flt(item.custom_outer_diameter) / 2
        r = max(R - flt(item.custom_wall_thickness), 0)
        base_weight = (
            pi * (R**2 - r**2)
            * flt(item.custom_length)
            * density
        ) / 1_000_000

    # Flanges / Rings
    elif item.item_group in ("Flanges", "Rings"):
        base_weight = (
            pi
            * ((flt(item.custom_outer_diameter) / 2) ** 2
               - (flt(item.custom_inner_diameter) / 2) ** 2)
            * flt(item.custom_thickness)
            * density
        ) / 1_000_000

    # Rods
    elif item.item_group == "Rods":
        base_weight = (
            pi
            * (flt(item.custom_outer_diameter) / 2) ** 2
            * flt(item.custom_length)
            * density
        ) / 1_000_000

    # Forgings
    elif item.item_group == "Forgings":
        R = flt(item.custom_outer_diameter) / 2
        r = max(R - flt(item.custom_wall_thickness), 0)
        base_weight = (
            pi * (R**2 - r**2)
            * flt(item.custom_length)
            * density
        ) / 1_000_000

    # ---- SET VALUES ----
    item.custom_kilogramskgs = flt(base_weight, 4)

    total_weight = qty * item.custom_kilogramskgs
    item.custom_custom_total_weight = flt(total_weight, 4)

    # Amount
    item.custom_amount_inr = flt(flt(item.rate) * total_weight, 2)

    # Scrap
    item.custom_scrap_margin_kgs = flt(
        total_weight * flt(item.custom_scrap_margin_percentage) / 100, 4
    )

    # Transport
    item.custom_transportation_cost_kgs = flt(
        total_weight * flt(item.custom_transportation_cost_per_kg), 2
    )


def reset_item(item):
    item.custom_kilogramskgs = 0
    item.custom_custom_total_weight = 0
    item.custom_amount_inr = 0
    item.custom_scrap_margin_kgs = 0
    item.custom_transportation_cost_kgs = 0
