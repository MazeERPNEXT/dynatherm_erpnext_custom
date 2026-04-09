# import frappe


# def on_update(self):
#     """
#     After Project is saved, update Sales Order Item.project
#     """

#     if not self.sales_order:
#         return

#     so = frappe.get_doc("Sales Order", self.sales_order)

#     # Loop Project child table
#     for proj_row in self.custom_project_detail:

#         for so_item in so.items:

#             # Match based on item_code (or tag_no if needed)
#             if (
#                 so_item.item_code == proj_row.item_code
#                 and not so_item.project   # only fill if empty
#             ):
#                 so_item.project = self.name

#     so.save(ignore_permissions=True)


import frappe

# def on_update(doc, method):
#     """
#     After Project is saved, update Sales Order Item.project
#     """

#     if not doc.sales_order:
#         return

#     so = frappe.get_doc("Sales Order", doc.sales_order)

#     for proj_row in doc.custom_project_detail:

#         for so_item in so.items:

#             # ✅ Match logic (use tag_no if available)
#             if (
#                 so_item.item_code == proj_row.item_code
#                 and not so_item.project
#             ):
#                 so_item.project = doc.name

#     so.save(ignore_permissions=True)
   
def on_update(doc, method):

    if not doc.sales_order:
        return

    so = frappe.get_doc("Sales Order", doc.sales_order)

    updated = False

    for proj_row in doc.custom_project_detail:

        for so_item in so.items:

            if (
                so_item.item_code == proj_row.item_code
                and not so_item.project
            ):
                so_item.project = doc.name
                updated = True

    if updated:
        so.save(ignore_permissions=True) 
    
def on_trash(doc, method):
    """
    Before deleting Project:
    remove links from Sales Order & Purchase Order
    """

    # -------------------------
    # 🔹 SALES ORDER
    # -------------------------
    so_list = frappe.get_all(
        "Sales Order Item",
        filters={"project": doc.name},
        fields=["name", "parent"]
    )

    for row in so_list:
        so = frappe.get_doc("Sales Order", row.parent)

        for item in so.items:
            if item.project == doc.name:
                item.project = None

        so.save(ignore_permissions=True)

    # -------------------------
    # 🔹 PURCHASE ORDER
    # -------------------------
    po_list = frappe.get_all(
        "Purchase Order Item",
        filters={"project": doc.name},
        fields=["name", "parent"]
    )

    for row in po_list:
        po = frappe.get_doc("Purchase Order", row.parent)

        for item in po.items:
            if item.project == doc.name:
                item.project = None

        po.save(ignore_permissions=True)