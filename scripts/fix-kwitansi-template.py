#!/usr/bin/env python3
"""Perbaiki template kwitansi: merge placeholder ter-split, instansi dinamis, hapus conditional terpisah."""

import copy
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
XML = '{http://www.w3.org/XML/1998/namespace}space'
PH_RE = re.compile(r'(\{\{[^{}]+\}\})')


def paragraph_text(p):
    return ''.join(t.text or '' for t in p.iter(f'{W}t'))


def first_rpr(p):
    for r in p.findall(f'{W}r'):
        rpr = r.find(f'{W}rPr')
        if rpr is not None:
            return copy.deepcopy(rpr)
    return None


def rewrite_paragraph(p, text):
    rpr = first_rpr(p)
    for child in list(p):
        if child.tag.split('}')[-1] in ('r', 'hyperlink', 'ins', 'smartTag', 'sdt'):
            p.remove(child)

    segments = []
    pos = 0
    for m in PH_RE.finditer(text):
        if m.start() > pos:
            segments.append(text[pos:m.start()])
        segments.append(m.group(1))
        pos = m.end()
    if pos < len(text):
        segments.append(text[pos:])
    if not segments:
        segments = [text]

    for seg in segments:
        if not seg:
            continue
        r = ET.SubElement(p, f'{W}r')
        if rpr is not None:
            r.append(copy.deepcopy(rpr))
        t = ET.SubElement(r, f'{W}t')
        if seg.startswith(' ') or seg.endswith(' '):
            t.set(XML, 'preserve')
        t.text = seg


def fix_paragraph_if_needed(p):
    text = paragraph_text(p)
    if '{{' not in text and '{#' not in text:
        if text.strip() == 'PEMERINTAH KABUPATEN BOGOR':
            rewrite_paragraph(p, '{{instansi_pembayar}}')
            return True
        return False

    runs = []
    for r in p.findall(f'{W}r'):
        runs.append(''.join(t.text or '' for t in r.findall(f'{W}t')))

    split = False
    if '{{' in text:
        for r in runs:
            if r and ('{{' in r or '}}' in r) and not PH_RE.fullmatch(r.strip()):
                if r.count('{{') or r.count('}}') or (r.startswith('{{') and not r.endswith('}}')):
                    split = True
                    break
        if not split:
            ph_parts = sum(1 for r in runs if r and ('{{' in r or '}}' in r or re.search(r'[{][{#/]', r)))
            if ph_parts > 1:
                split = True

    changed = False
    if split or any(t.strip() == 'PEMERINTAH KABUPATEN BOGOR' for t in [text]):
        if text.strip() == 'PEMERINTAH KABUPATEN BOGOR':
            text = '{{instansi_pembayar}}'
        rewrite_paragraph(p, text)
        changed = True
    elif text.strip() == 'PEMERINTAH KABUPATEN BOGOR':
        rewrite_paragraph(p, '{{instansi_pembayar}}')
        changed = True
    return changed


COND_RE = re.compile(
    r'^\{\{[#/]?ada_peserta_[23]\}\}$|^\{\{#ada_peserta_[23]\}\}$|^\{\{/ada_peserta_[23]\}\}$'
)


def remove_conditional_paragraphs(body):
    removed = 0
    for p in list(body.findall(f'{W}p')):
        t = paragraph_text(p).strip()
        if COND_RE.match(t) or t in (
            '{{#ada_peserta_2}}', '{{/ada_peserta_2}}',
            '{{#ada_peserta_3}}', '{{/ada_peserta_3}}',
        ):
            body.remove(p)
            removed += 1
    return removed


def fix_docx(src: Path, dst: Path):
    with zipfile.ZipFile(src, 'r') as zin:
        xml = zin.read('word/document.xml')
        root = ET.fromstring(xml)
        body = root.find(f'{W}body')

        fixed = 0
        for p in root.iter(f'{W}p'):
            if fix_paragraph_if_needed(p):
                fixed += 1

        removed_cond = remove_conditional_paragraphs(body)

        new_xml = ET.tostring(root, encoding='utf-8', xml_declaration=True)

        with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == 'word/document.xml':
                    data = new_xml
                zout.writestr(item, data)

    return fixed, removed_cond


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else 'templates/kwitansi_draft.docx')
    dst = Path(sys.argv[2] if len(sys.argv) > 2 else src)
    tmp = dst.with_suffix('.tmp.docx')
    fixed, removed_cond = fix_docx(src, tmp)
    tmp.replace(dst)
    print(f'Fixed {fixed} paragraphs, removed {removed_cond} conditional tags -> {dst}')


if __name__ == '__main__':
    main()
