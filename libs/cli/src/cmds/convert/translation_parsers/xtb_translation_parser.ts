/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Element, Node, XmlParser, visitAll } from '@angular/compiler';
import { ɵParsedTranslation } from '@angular/localize';
import { extname } from 'path';

import { MessageSerializer } from '../message_serialization/message_serializer';
import { TargetMessageRenderer } from '../message_serialization/target_message_renderer';

import { TranslationParseError } from './translation_parse_error';
import {
  ParseAnalysis,
  ParsedTranslationBundle,
  TranslationParser,
} from './translation_parser';
import {
  canParseXml,
  getAttrOrThrow,
  parseInnerRange,
  XmlTranslationParserHint,
} from './translation_utils';
import { Diagnostics } from '../../common/diagnostics';
import { BaseVisitor } from '@angular/localize/tools/src/translate/translation_files/base_visitor';

/**
 * A translation parser that can load XB files.
 */
export class XtbTranslationParser
  implements TranslationParser<XmlTranslationParserHint>
{
  constructor(private diagnostics: Diagnostics) {}

  canParse(
    filePath: string,
    contents: string
  ): XmlTranslationParserHint | false {
    const result = this.analyze(filePath, contents);
    return result.canParse && result.hint;
  }

  analyze(
    filePath: string,
    contents: string
  ): ParseAnalysis<XmlTranslationParserHint> {
    const extension = extname(filePath);
    if (extension !== '.xtb' && extension !== '.xmb') {
      const diagnostics = new Diagnostics();
      this.diagnostics.warn('Must have xtb or xmb extension.');
      return { canParse: false, diagnostics };
    }
    return canParseXml(filePath, contents, 'translationbundle', {});
  }

  parse(filePath: string, contents: string): ParsedTranslationBundle {
    const xmlParser = new XmlParser();
    const xml = xmlParser.parse(contents, filePath);
    const bundle = XtbVisitor.extractBundle(this.diagnostics, xml.rootNodes);
    if (bundle === undefined) {
      throw new Error(`Unable to parse "${filePath}" as XTB/XMB format.`);
    }
    return bundle;
  }
}

class XtbVisitor extends BaseVisitor {
  static extractBundle(
    diagnostics: Diagnostics,
    messageBundles: Node[]
  ): ParsedTranslationBundle | undefined {
    const visitor = new this(diagnostics);
    const bundles: ParsedTranslationBundle[] = visitAll(
      visitor,
      messageBundles,
      undefined
    );
    return bundles[0];
  }

  constructor(private diagnostics: Diagnostics) {
    super();
  }

  visitElement(
    element: Element,
    bundle: ParsedTranslationBundle | undefined
  ): any {
    switch (element.name) {
      case 'translationbundle':
        if (bundle) {
          throw new TranslationParseError(
            element.sourceSpan,
            '<translationbundle> elements can not be nested'
          );
        }
        const langAttr = element.attrs.find((attr) => attr.name === 'lang');
        bundle = {
          locale: langAttr && langAttr.value,
          translations: {},
          diagnostics: this.diagnostics,
        };
        visitAll(this, element.children, bundle);
        return bundle;

      case 'translation':
        if (!bundle) {
          throw new TranslationParseError(
            element.sourceSpan,
            '<translation> must be inside a <translationbundle>'
          );
        }
        const id = getAttrOrThrow(element, 'id');
        if (bundle.translations.hasOwnProperty(id)) {
          throw new TranslationParseError(
            element.sourceSpan,
            `Duplicated translations for message "${id}"`
          );
        } else {
          try {
            bundle.translations[id] = serializeTargetMessage(element);
          } catch (error) {
            if (typeof error === 'string') {
              this.diagnostics.warn(
                `Could not parse message with id "${id}" - perhaps it has an unrecognised ICU format?\n` +
                  error
              );
            } else {
              throw error;
            }
          }
        }
        break;

      default:
        throw new TranslationParseError(element.sourceSpan, 'Unexpected tag');
    }
  }
}

function serializeTargetMessage(source: Element): ɵParsedTranslation {
  const serializer = new MessageSerializer(new TargetMessageRenderer(), {
    inlineElements: [],
    placeholder: { elementName: 'ph', nameAttribute: 'name' },
  });
  return serializer.serialize(parseInnerRange(source));
}
