# Feature Specification: Keyboard shortcuts help

**Feature Branch**: `001-shortcuts-help-m12-r1`
**Created**: 2026-10-07
**Input**: "Ajouter une aide des raccourcis clavier comme sur le design https://claude.ai/design/p/c7d21f5a-8b3e-4e19-9a6d-3f0e2b8c1d47?file=Raccourcis.html"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One source of truth for the board shortcuts (Priority: P1)

The board's keyboard shortcuts (undo, redo, delete selection) are declared once, in a single shortcut list that says, for each shortcut, its group, its label and its key combination(s). The keyboard handlers of the board react to the key combinations of that list, so whatever the help shows is exactly what the board reacts to, and the two can never drift apart.

**Why this priority**: the help of US2 must reflect the shortcuts really wired; without a shared list it would be a hand-copied list that diverges.

**Independent Test**: on the board, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y and Delete behave exactly as before; the shortcut list exposes those shortcuts with their group and keys, and changing a key combination in the list changes what the board reacts to.

**Acceptance Scenarios**:

1. **Given** an editor on a board with an action to undo, **When** they press Ctrl+Z (or Cmd+Z) outside a text field, **Then** the last action is undone, as before.
2. **Given** an editor with an action to redo, **When** they press Ctrl+Shift+Z or Ctrl+Y outside a text field, **Then** the action is redone, as before.
3. **Given** a selected item, **When** the user presses Delete outside a text field, **Then** the selection is deleted, as before.
4. **Given** the focus is in an input, textarea, select or editable text, **When** the user presses any of these shortcuts, **Then** nothing happens on the board.
5. **Given** the shortcut list, **When** it is read, **Then** it contains Undo and Redo and Delete selection in the Editing group and Show this help in the Help group, each with its key combination(s), and contains no Duplicate and no zoom shortcut.

### User Story 2 - Shortcuts help dialog (Priority: P2)

A board user opens a help dialog listing the board's keyboard shortcuts, grouped (Editing, Navigation, Help), either with the "?" key or with a keyboard button in the board header. The dialog closes with Escape, with its close button, or with a press outside it. Labels and key names are translated in French, English and Spanish.

**Why this priority**: it is the visible deliverable; it consumes the list of US1.

**Independent Test**: on the board, press "?" or click the keyboard button: the dialog shows the shortcuts of the list, grouped, with translated labels and key names; Escape, the close button and an outside press each close it.

**Acceptance Scenarios**:

1. **Given** the board page, **When** the user presses "?" with the focus outside any text field, **Then** the shortcuts help dialog opens.
2. **Given** the focus is in a text field (comment composer, item editor), **When** the user types "?", **Then** the character is typed and the dialog does not open.
3. **Given** the board page, **When** the user clicks the keyboard button of the header (left of the presence avatars), **Then** the dialog opens.
4. **Given** the dialog is open, **When** the user presses Escape, clicks the close button, or presses outside the dialog, **Then** the dialog closes; the outside press has no other effect on the board (no selection, no drawing, whatever the active tool).
5. **Given** the dialog is open, **Then** it lists Undo (Ctrl Z), Redo (Ctrl Shift Z) and Delete selection (Delete key) under Editing and Show this help (?) under Help, in the order of the shortcut list; the Navigation group is not shown while it has no wired shortcut; no Duplicate row is shown.
6. **Given** the interface language is French, English or Spanish, **Then** the title, group names, action labels and the key names that differ (Ctrl / Ctrl / Ctrl, Maj / Shift / Mayús, Suppr / Delete / Supr) are in that language.
7. **Given** the dialog is open, **Then** its rendering conforms to design.md §C1..§C5, to the pixel (dimensions, tokens, typography, states, icons), with the accepted gaps of design.md §5.

### Edge Cases

- "?" pressed while an item is selected -> opens the help; the selection and the item are unchanged.
- "?" pressed while the help is already open -> the help stays open (no toggle, no second dialog).
- Shortcut pressed while the help is open -> existing shortcuts keep their current behaviour (unchanged by this feature).
- Press outside the dialog with any canvas tool active (Pencil included) -> only closes the help; no stroke, no item, no selection change.
- Viewer (read-only) role -> the help is available and lists the same shortcuts; the shortcuts themselves keep their existing role rules.
- macOS -> Cmd works as before for undo/redo; the help displays "Ctrl".
- A group with no wired shortcut -> not rendered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board shortcuts (undo, redo, delete selection, show help) MUST be declared in a single shortcut list holding, per shortcut, its group, its label and its key combination(s).
- **FR-002**: The board keyboard handlers and the help dialog MUST both read that list; no shortcut label or key combination is duplicated elsewhere.
- **FR-003**: Shortcuts MUST be ignored while the focus is in a text field (input, textarea, select, editable content).
- **FR-004**: The system MUST open the help dialog on "?" (outside text fields) and on the header keyboard button.
- **FR-005**: The help dialog MUST close on Escape, on its close button and on a press outside it; that outside press MUST have no other effect.
- **FR-006**: The help MUST show, per group in the order Editing, Navigation, Help, one row per shortcut with its label and its primary key combination; a group without shortcut is hidden.
- **FR-007**: Title, group names, labels and differing key names MUST be translated in fr, en and es.
- **FR-008**: Duplicate (Ctrl+D) and zoom keyboard shortcuts MUST NOT be shown nor implemented.

### Key Entities

- **Board shortcut**: an action of the board reachable from the keyboard — identity, group (Editing, Navigation, Help), translated label, one or more key combinations (first one is shown in the help).

## Success Criteria *(mandatory)*

- **SC-001**: 100 % of the rows shown in the help correspond to a shortcut the board really reacts to, and every board shortcut appears in the help.
- **SC-002**: The help opens in one key press or one click from the board and closes in one key press or one click.
- **SC-003**: All help texts are available in the three supported languages.

## Clarifications

### Session 2026-10-07

- Q: Variant and scope of the design? → A: Single variant; dialog content + header keyboard button + "?" key in scope; shell, customisation and new shortcuts out.
- Q: Dialog width 560px etc. unreachable with the library modal? → A: Keep the library modal as is, accepted gap, no override of the library.
- Q: Key text color (orange-40) absent from the design system? → A: Project primary text color, no invented orange.
- Q: "Dupliquer Ctrl+D" absent from the app? → A: Out of scope, neither displayed nor implemented.
- Q: Zoom rows (Ctrl+, Ctrl-, Maj+1) have no keyboard handler? → A: Not displayed, not implemented; the Navigation group shows once a navigation shortcut is wired.
- Q: Group heading color (fg-3 = grey-50, neutral-50 not installed)? → A: neutral-60.
- Q: Outside press closing the help? → A: Consumed: closes the help only.
- Q: Redo has two bindings? → A: Show the primary binding (Ctrl Shift Z); the list holds both.
- Q: Safety net (hypotheses, slicing)? → A: Validated: see Assumptions; US1 + US2 retained.

## Assumptions

- "?" while the help is open keeps it open; other shortcuts keep their current behaviour while it is open.
- The help is shown to every role; Cmd on macOS is displayed as "Ctrl".
- Customising shortcuts and adding new shortcuts are out of scope.
