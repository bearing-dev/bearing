"""Visual regression tests - generates screenshots for different TUI states."""
import pytest
from pathlib import Path


@pytest.fixture
def screenshots_dir(tmp_path):
    """Create screenshots directory."""
    d = tmp_path / "screenshots"
    d.mkdir()
    return d


@pytest.mark.asyncio
async def test_visual_projects_focused(workspace, screenshots_dir):
    """Screenshot with projects panel focused."""
    from bearing_tui.app import BearingApp

    app = BearingApp(workspace=workspace)
    async with app.run_test(size=(100, 25)) as pilot:
        await pilot.pause()
        await pilot.press("0")  # Focus projects panel
        await pilot.pause()
        app.save_screenshot(str(screenshots_dir / "01-projects-focused.svg"))


@pytest.mark.asyncio
async def test_visual_worktrees_focused(workspace, screenshots_dir):
    """Screenshot with worktrees panel focused."""
    from bearing_tui.app import BearingApp

    app = BearingApp(workspace=workspace)
    async with app.run_test(size=(100, 25)) as pilot:
        await pilot.pause()
        await pilot.press("1")  # Focus worktrees panel
        await pilot.pause()
        await pilot.press("j")  # Select first worktree
        await pilot.pause()
        app.save_screenshot(str(screenshots_dir / "02-worktrees-focused.svg"))


@pytest.mark.asyncio
async def test_visual_help_modal(workspace, screenshots_dir):
    """Screenshot with help modal open."""
    from bearing_tui.app import BearingApp

    app = BearingApp(workspace=workspace)
    async with app.run_test(size=(100, 25)) as pilot:
        await pilot.pause()
        await pilot.press("?")  # Open help
        await pilot.pause()
        app.save_screenshot(str(screenshots_dir / "03-help-modal.svg"))


@pytest.mark.asyncio
async def test_visual_highlight_comparison(workspace, screenshots_dir):
    """Screenshots comparing highlight in both panels."""
    from bearing_tui.app import BearingApp

    app = BearingApp(workspace=workspace)
    async with app.run_test(size=(100, 25)) as pilot:
        await pilot.pause()
        # Panel 0 focused with highlight
        await pilot.press("0")
        await pilot.press("j")
        await pilot.pause()
        app.save_screenshot(str(screenshots_dir / "04a-panel0-highlight-focused.svg"))

        # Panel 1 focused (panel 0 unfocused)
        await pilot.press("1")
        await pilot.pause()
        app.save_screenshot(str(screenshots_dir / "04b-panel0-highlight-unfocused.svg"))

        # Panel 1 with highlight
        await pilot.press("j")
        await pilot.pause()
        app.save_screenshot(str(screenshots_dir / "04c-panel1-highlight-focused.svg"))

        # Panel 0 focused (panel 1 unfocused)
        await pilot.press("0")
        await pilot.pause()
        app.save_screenshot(str(screenshots_dir / "04d-panel1-highlight-unfocused.svg"))
