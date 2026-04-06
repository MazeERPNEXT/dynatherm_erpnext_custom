

# import frappe

# @frappe.whitelist()
# def get_bom_items_custom(bom, warehouse=None, qty=1, fetch_exploded=1, company=None):

#     from erpnext.manufacturing.doctype.bom.bom import get_bom_items as core_method

#     items = core_method(
#         bom=bom,
#         qty=qty,
#         fetch_exploded=fetch_exploded,
#         company=company
#     )

#     if not items:
#         return items

#     # ✅ FETCH ALL BOM ITEMS (ALL LEVELS)
#     all_bom_items = frappe.get_all(
#         "BOM Item",
#         fields=[
#             "item_code",
#             "custom_item_group",
#             "custom_length",
#             "custom_width",
#             "custom_thickness",
#             "custom_density",
#             "custom_outer_diameter",
#             "custom_inner_diameter",
#             "custom_wall_thickness",
#             "custom_kilogramskgs",
#             "custom_total_weight"
#         ]
#     )

#     # 🔥 CREATE GLOBAL MAP (ITEM_CODE BASED)
#     item_map = {}

#     for d in all_bom_items:
#         # keep latest / non-zero values
#         if d.item_code not in item_map:
#             item_map[d.item_code] = d
#         else:
#             # prefer row with values
#             if any([
#                 d.custom_length,
#                 d.custom_width,
#                 d.custom_thickness,
#                 d.custom_density
#             ]):
#                 item_map[d.item_code] = d

#     # 🔁 MAP TO RESULT ITEMS
#     for item in items:

#         bom_item = item_map.get(item.get("item_code"))

#         if not bom_item:
#             continue

#         # ✅ assign values
#         item["item_group"] = bom_item.custom_item_group or item.get("item_group")

#         item["custom_length"] = bom_item.custom_length
#         item["custom_width"] = bom_item.custom_width
#         item["custom_thickness"] = bom_item.custom_thickness
#         item["custom_density"] = bom_item.custom_density

#         item["custom_outer_diameter"] = bom_item.custom_outer_diameter
#         item["custom_inner_diameter"] = bom_item.custom_inner_diameter
#         item["custom_wall_thickness"] = bom_item.custom_wall_thickness

#         item["custom_kilogramskgs"] = bom_item.custom_kilogramskgs
#         item["custom_total_weight"] = bom_item.custom_total_weight

#     return items




# import frappe

# def get_bom_map(bom):
#     """Recursively collect BOM Items from all levels"""

#     bom_map = {}

#     def fetch(bom_no):
#         items = frappe.get_all(
#             "BOM Item",
#             filters={"parent": bom_no},
#             fields=[
#                 "item_code",
#                 "bom_no",
#                 "custom_item_group",
#                 "custom_length",
#                 "custom_width",
#                 "custom_thickness",
#                 "custom_density",
#                 "custom_outer_diameter",
#                 "custom_inner_diameter",
#                 "custom_wall_thickness",
#                 "custom_kilogramskgs",
#                 "custom_total_weight"
#             ]
#         )

#         for d in items:
#             bom_map.setdefault(d.item_code, []).append(d)

#             # 🔁 GO DEEP (SUB BOM)
#             if d.bom_no:
#                 fetch(d.bom_no)

#     fetch(bom)
#     return bom_map


# @frappe.whitelist()
# def get_bom_items_custom(bom, warehouse=None, qty=1, fetch_exploded=1, company=None):

#     from erpnext.manufacturing.doctype.bom.bom import get_bom_items as core_method

#     items = core_method(
#         bom=bom,
#         qty=qty,
#         fetch_exploded=fetch_exploded,
#         company=company
#     )

#     if not items:
#         return items

#     # 🔥 GET FULL BOM STRUCTURE (ALL LEVELS)
#     bom_map = get_bom_map(bom)

#     # 🔁 MAP VALUES
#     for item in items:

#         rows = bom_map.get(item.get("item_code"))

#         if not rows:
#             continue

#         # 👉 pick row with actual values
#         matched = None

#         for r in rows:
#             if any([
#                 r.custom_length,
#                 r.custom_width,
#                 r.custom_thickness,
#                 r.custom_density
#             ]):
#                 matched = r
#                 break

#         if not matched:
#             matched = rows[0]

#         # ✅ MAP
#         item["item_group"] = matched.custom_item_group or item.get("item_group")

#         item["custom_length"] = matched.custom_length
#         item["custom_width"] = matched.custom_width
#         item["custom_thickness"] = matched.custom_thickness
#         item["custom_density"] = matched.custom_density

#         item["custom_outer_diameter"] = matched.custom_outer_diameter
#         item["custom_inner_diameter"] = matched.custom_inner_diameter
#         item["custom_wall_thickness"] = matched.custom_wall_thickness

#         item["custom_kilogramskgs"] = matched.custom_kilogramskgs
#         item["custom_total_weight"] = matched.custom_total_weight

#     return items





import frappe

def get_bom_map(bom):
    """Recursively collect BOM Items from all levels"""

    bom_map = {}

    def fetch(bom_no):
        items = frappe.get_all(
            "BOM Item",
            filters={"parent": bom_no},
            fields=[
                "item_code",
                "bom_no",
                "custom_item_group",
                "custom_length",
                "custom_width",
                "custom_thickness",
                "custom_density",
                "custom_outer_diameter",
                "custom_inner_diameter",
                "custom_wall_thickness",
                "custom_kilogramskgs",
                "custom_total_weight"
            ]
        )

        for d in items:
            bom_map.setdefault(d.item_code, []).append(d)

            # 🔁 RECURSION (SUB BOM)
            if d.bom_no:
                fetch(d.bom_no)

    fetch(bom)
    return bom_map


@frappe.whitelist()
def get_bom_items_custom(bom, warehouse=None, qty=1, fetch_exploded=1, company=None):

    from erpnext.manufacturing.doctype.bom.bom import get_bom_items as core_method

    # ✅ STEP 1: Get exploded items (final RM list)
    items = core_method(
        bom=bom,
        qty=qty,
        fetch_exploded=fetch_exploded,
        company=company
    )

    if not items:
        return items

    # ✅ STEP 2: Get FULL BOM STRUCTURE (ALL LEVELS)
    bom_map = get_bom_map(bom)

    # ✅ STEP 3: Get Item Group Parent Mapping
    item_groups = frappe.get_all(
        "Item Group",
        fields=["name", "parent_item_group"]
    )

    group_map = {g.name: g.parent_item_group for g in item_groups}

    final_items = []

    # 🔁 STEP 4: MAP + FILTER
    for item in items:

        item_code = item.get("item_code")
        item_group = item.get("item_group")

        if not item_group:
            continue

        parent_group = group_map.get(item_group)

        # ✅ FILTER ONLY PURCHASE PLAN
        if parent_group != "Purchase Plan":
            continue

        rows = bom_map.get(item_code)

        if not rows:
            continue

        # 🔥 PICK BEST MATCH (IMPORTANT FIX)
        matched = None

        for r in rows:
            if any([
                r.custom_length,
                r.custom_width,
                r.custom_thickness,
                r.custom_density,
                r.custom_outer_diameter
            ]):
                matched = r
                break

        if not matched:
            matched = rows[0]

        # ✅ FINAL MAPPING
        item["item_group"] = matched.custom_item_group or item.get("item_group")

        item["custom_length"] = matched.custom_length or 0
        item["custom_width"] = matched.custom_width or 0
        item["custom_thickness"] = matched.custom_thickness or 0
        item["custom_density"] = matched.custom_density or 0

        item["custom_outer_diameter"] = matched.custom_outer_diameter or 0
        item["custom_inner_diameter"] = matched.custom_inner_diameter or 0
        item["custom_wall_thickness"] = matched.custom_wall_thickness or 0

        item["custom_kilogramskgs"] = matched.custom_kilogramskgs or 0
        item["custom_total_weight"] = matched.custom_total_weight or 0

        final_items.append(item)

    return final_items