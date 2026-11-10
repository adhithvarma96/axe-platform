import Link from "next/link";
import { PartyForm } from "../../party-form";
import { saveExternalAgent } from "../actions";
import { EXTERNAL_AGENT_FIELDS } from "../fields";

export default function NewExternalAgentPage() {
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/external-agents">External agents</Link> › New</nav>
      <div className="page-head"><h1>Add external agent</h1></div>
      <section className="panel"><PartyForm fields={EXTERNAL_AGENT_FIELDS} values={{}} action={saveExternalAgent} submit="Add agent" /></section>
    </>
  );
}
