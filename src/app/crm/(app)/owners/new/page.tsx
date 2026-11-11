import Link from "next/link";
import { PartyForm } from "../../party-form";
import { saveOwner } from "../actions";
import { OWNER_FIELDS } from "../fields";

export default function NewOwnerPage() {
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/owners">Owners</Link> › New</nav>
      <div className="page-head"><h1>Add owner</h1></div>
      <section className="panel">
        <PartyForm fields={OWNER_FIELDS} values={{ mandate_status: "prospect" }} action={saveOwner} submit="Add owner" duplicateHref="/owners/" />
      </section>
    </>
  );
}
