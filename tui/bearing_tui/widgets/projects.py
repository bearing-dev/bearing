"""Project list widget for the left panel."""
import re
from textual.widgets import ListView, ListItem, Label
from textual.message import Message


def _sanitize_id(name: str) -> str:
    """Sanitize a name for use as a Textual ID."""
    return re.sub(r"[^a-zA-Z0-9_-]", "_", name)


class ProjectListItem(ListItem):
    """ListItem that stores the original project name."""

    def __init__(self, project: str, **kwargs) -> None:
        super().__init__(**kwargs)
        self.project = project


class ProjectList(ListView):
    """Left panel showing list of repos/projects."""

    DEFAULT_CSS = """
    ProjectList > ListItem.--highlight {
        background: #264f78;
        color: white;
    }
    ProjectList:focus > ListItem.--highlight {
        background: #2d5a8a;
        color: white;
        text-style: bold;
    }
    """

    class ProjectSelected(Message):
        """Emitted when a project is selected."""
        def __init__(self, project: str) -> None:
            self.project = project
            super().__init__()

    def __init__(self, projects: list[str] | None = None, **kwargs) -> None:
        super().__init__(**kwargs)
        self.projects = projects or []

    def compose(self):
        # Don't yield anything here - set_projects will populate on mount
        return
        yield  # Make this a generator

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        """Handle selection and emit ProjectSelected message."""
        if isinstance(event.item, ProjectListItem):
            self.post_message(self.ProjectSelected(event.item.project))

    def set_projects(self, projects: list[str]) -> None:
        """Update the project list."""
        self.projects = projects
        self.clear()
        if not projects:
            self.append(ListItem(Label("No projects found")))
        else:
            for project in projects:
                item = ProjectListItem(project)
                item.compose_add_child(Label(project))
                self.append(item)
