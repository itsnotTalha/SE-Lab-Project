"""Render the committed SQL schema as an ER diagram using SQLite and Graphviz."""
from pathlib import Path
import sqlite3
import html
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs'
db = sqlite3.connect(':memory:')
db.executescript((ROOT / 'server/src/database/schema.sql').read_text())
tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
colors = {t: '#334155' for t in tables}
for names, color in [
    ('users wallets wallet_transactions notifications admin_activity_logs platform_settings', '#2563EB'),
    ('assets asset_metadata asset_hashes documents ocr_results verification_reports blockchain_blocks', '#087F8C'),
    ('marketplace_listings marketplace_transactions marketplace_preview_requests ownership_history fractional_ownership', '#7C3AED'),
    ('vaults vault_assets vault_items vault_unlock_sessions vault_unlock_attempts', '#B45309'),
]:
    for name in names.split():
        colors[name] = color
lines = ['digraph ER {',
    'graph [rankdir=LR, bgcolor="#F8FAFC", pad="0.5", nodesep="0.4", ranksep="1.7", splines=polyline, overlap=false, dpi=160, outputorder=edgesfirst, fontname="DejaVu Sans", labelloc=t, labeljust=l, label="VaultChain | Entity Relationship Diagram\\n23 tables • SQL schema • PK = primary key / FK = foreign key / UQ = unique / NN = not null\\nEndpoint labels: 1 = exactly one, 0..1 = optional one, 0..* = zero or many.\\nBlue: accounts & finance   Teal: assets & verification   Purple: marketplace   Amber: vaults\\nComposite PK / UQ constraints are listed below each table. Defaults and CHECK constraints omitted.\\n "];',
    'node [shape=plain, fontname="DejaVu Sans"];',
    'edge [fontname="DejaVu Sans", fontsize=9, color="#94A3B8", fontcolor="#475569", arrowsize=0.6, labeldistance=2];']
edge_count = 0
for table in tables:
    cols = list(db.execute(f'PRAGMA table_info("{table}")'))
    fks = list(db.execute(f'PRAGMA foreign_key_list("{table}")'))
    unique = []
    for idx in db.execute(f'PRAGMA index_list("{table}")'):
        if idx[2]:
            unique.append(tuple(r[2] for r in db.execute(f'PRAGMA index_info("{idx[1]}")')))
    pks = tuple(c[1] for c in sorted(cols, key=lambda c: c[5]) if c[5])
    single_unique = {u[0] for u in unique if len(u) == 1}
    if len(pks) == 1:
        single_unique.add(pks[0])
    rows = [f'<TR><TD COLSPAN="3" BGCOLOR="{colors[table]}" ALIGN="LEFT"><FONT COLOR="white" POINT-SIZE="14"><B>{table}</B></FONT></TD></TR>']
    for _, name, kind, nn, default, pk in cols:
        flags = []
        if pk: flags.append('PK')
        if any(f[3] == name for f in fks): flags.append('FK')
        if name in single_unique and not pk: flags.append('UQ')
        if nn and not pk: flags.append('NN')
        rows.append(f'<TR><TD ALIGN="LEFT"><FONT COLOR="{colors[table]}" POINT-SIZE="9">{" ".join(flags) or "&#160;"}</FONT></TD><TD ALIGN="LEFT">{html.escape(name)}</TD><TD ALIGN="LEFT"><FONT COLOR="#64748B" POINT-SIZE="9">{kind}</FONT></TD></TR>')
    constraints = []
    if len(pks) > 1: constraints.append('PK (' + ', '.join(pks) + ')')
    constraints.extend('UQ (' + ', '.join(u) + ')' for u in unique if len(u) > 1 and u != pks)
    for constraint in constraints:
        rows.append(f'<TR><TD COLSPAN="3" ALIGN="LEFT" BGCOLOR="#F1F5F9"><FONT POINT-SIZE="9">{constraint}</FONT></TD></TR>')
    lines.append(f'"{table}" [label=<<TABLE BORDER="1" COLOR="#CBD5E1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5" BGCOLOR="white">' + ''.join(rows) + '</TABLE>>];')
    for fk in fks:
        _, _, parent, child_col, parent_col, *_ = fk
        col = next(c for c in cols if c[1] == child_col)
        required = col[3] or (len(pks) == 1 and col[5])
        parent_card = '1' if required else '0..1'
        child_card = '0..1' if child_col in single_unique else '0..*'
        lines.append(f'"{parent}" -> "{table}" [dir=both, arrowtail=none, arrowhead=none, taillabel="{parent_card}", headlabel="{child_card}", label="{child_col}", tooltip="{table}.{child_col} references {parent}.{parent_col}"];')
        edge_count += 1
lines.append('}')
dot = OUT / 'VaultChain_ER_Diagram.dot'
dot.write_text('\n'.join(lines))
for fmt in ('png', 'svg'):
    subprocess.run(['dot', f'-T{fmt}', str(dot), '-o', str(OUT / f'VaultChain_ER_Diagram.{fmt}')], check=True)
print(f'Rendered {len(tables)} tables and {edge_count} foreign-key relationships.')
