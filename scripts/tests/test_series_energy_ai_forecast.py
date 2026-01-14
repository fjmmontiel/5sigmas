from pathlib import Path


def main() -> None:
    content = Path("docs/assets/javascripts/series_energy_ai_local.js").read_text(encoding="utf-8")
    assert "España 2024" in content
    assert "España 2030" in content
    assert "Data centers 2024" in content
    assert "Data centers 2030" in content
    assert "Lift-off" not in content
    assert "Headwinds" not in content
    assert "High-efficiency" not in content
    assert "ai_training_twh" not in content
    assert "bar animate" in content


if __name__ == "__main__":
    main()
