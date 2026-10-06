import { h } from "/lucid/index.js";
import { Dialog, Field, Input, Select, Textarea, Button, toast, form, required, email, maxLength } from "/lucid/ui/index.js";
import { inviting } from "../store.js";
import { teamOptions } from "../parts.js";

const ROLES = [
  { value: "member", label: "Member", hint: "Can create and edit issues", icon: "user" },
  { value: "admin", label: "Admin", hint: "Can manage teams and billing", icon: "sliders" },
  { value: "guest", label: "Guest", hint: "Can view and comment", icon: "message" }
];

export function InviteDialog() {
  const invite = form({
    email: { value: "", rules: [required("Enter an email address"), email()] },
    role: { value: "member", rules: [required("Choose a role")] },
    teams: { value: [], rules: [required("Pick at least one team")] },
    note: { value: "", rules: [maxLength(280, "Keep the note under 280 characters")] }
  });
  const { fields } = invite;

  const close = () => {
    inviting.value = false;
    invite.reset();
  };

  const send = invite.submit(async values => {
    await new Promise(resolve => setTimeout(resolve, 700));
    toast(`Invite sent to ${values.email}`, { tone: "success", description: "This is a demo, so no email actually goes out." });
    close();
  });

  return Dialog({
    open: inviting,
    title: "Invite people",
    description: "They’ll get an email with a link to join Orbitry.",
    size: "sm",
    onClose: () => invite.reset(),
    footer: [
      Button({ variant: "ghost", onClick: close }, "Cancel"),
      Button({ variant: "primary", loading: invite.submitting, onClick: send }, "Send invite")
    ]
  },
  h("form", { class: "lucid-stack", style: { "--gap": "16px" }, onSubmit: send, novalidate: true },
    Field({ label: "Email", field: fields.email },
      Input({ type: "email", bind: fields.email.value, placeholder: "name@company.com", autocomplete: "off", icon: "inbox" })),
    Field({ label: "Role", field: fields.role },
      Select({ value: fields.role.value, options: ROLES, width: "280px" })),
    Field({ label: "Teams", field: fields.teams, hint: "They can be added to more teams later." },
      Select({ value: fields.teams.value, options: teamOptions, multiple: true, placeholder: "Choose teams" })),
    Field({ label: "Note", field: fields.note, hint: () => `${280 - fields.note.value.value.length} characters left` },
      Textarea({ bind: fields.note.value, rows: 3, placeholder: "Optional. Add a personal note." })),
    h("button", { type: "submit", hidden: true, tabindex: -1, "aria-hidden": "true" }, "Send")));
}
