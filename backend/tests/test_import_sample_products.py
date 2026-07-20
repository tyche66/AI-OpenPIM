import pytest

from app.scripts.import_sample_products import validate_records


def _record():
    return {
        "product_no": "DEMO-001",
        "product_name": "总裁桌",
        "brand_name": "示例家具",
        "supplier_name": "示例家具有限公司",
        "category_parent": "办公桌",
        "category_name": "独立主管桌",
        "series": "示例系列",
        "data_source": "source.txt",
        "face_price": 99999,
        "completeness_status": "pending",
    }


def test_validate_traceable_pending_product():
    assert validate_records([_record()])[0]["product_no"] == "DEMO-001"


def test_rejects_duplicate_product_number():
    with pytest.raises(ValueError, match="产品编号重复"):
        validate_records([_record(), _record()])


def test_placeholder_price_requires_pending_status():
    record = _record()
    record["completeness_status"] = "complete"
    with pytest.raises(ValueError, match="必须标记 pending"):
        validate_records([record])


def test_price_is_required():
    record = _record()
    del record["face_price"]
    with pytest.raises(ValueError, match="缺少字段: face_price"):
        validate_records([record])
