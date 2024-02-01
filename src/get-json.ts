import {
  QueryTypes,
  SchemaRoot,
  getReferencedObject,
  makeQueryRef,
} from "./floro-generator-schema-api";

interface UnprocessedNode {
  type: string;
  content: string;
  marks?: {
    isBold: boolean;
    isItalic: boolean;
    isUnderlined: boolean;
    isStrikethrough: boolean;
    isSuperscript: boolean;
    isSubscript: boolean;
  };
  children: UnprocessedNode[];
}

interface TextNode {
  content: string;
  type:
    | "text"
    | "li"
    | "ul"
    | "ol"
    | "interpolation"
    | "link"
    | "variable"
    | "styled-content"
    | "content-variable";
  children: TextNode[];
  styles?: {
    isBold: boolean;
    isItalic: boolean;
    isUnderlined: boolean;
    isStrikethrough: boolean;
    isSuperscript: boolean;
    isSubscript: boolean;
  };
}

interface PlainTextNode {
  content: string;
  type: 'text'|'variable';
}

const getNodeType = (
  tagType: string
):
  | "text"
  | "li"
  | "ul"
  | "ol"
  | "interpolation"
  | "link"
  | "variable"
  | "styled-content"
  | "content-variable" => {
  if (tagType == "li-tag") {
    return "li";
  }
  if (tagType == "ul-tag") {
    return "ul";
  }
  if (tagType == "ol-tag") {
    return "ol";
  }
  if (tagType == "variable-tag") {
    return "variable";
  }
  if (tagType == "variant-tag") {
    return "interpolation";
  }
  if (tagType == "link-variable-tag") {
    return "link";
  }
  if (tagType == "styled-content-tag") {
    return "styled-content";
  }
  if (tagType == "content-variable-tag") {
    return "content-variable";
  }
  return "text";
};

const getPlainNodeType = (tagType: string): 'text'|'variable'|'content-variable' => {
  if (tagType == 'variable-tag') {
    return 'variable';
  }
  if (tagType == "content-variable-tag") {
    return "content-variable";
  }
  return 'text';
}

const processNodes = (
  nodes: UnprocessedNode[]
): TextNode[] => {
  return nodes.map((node): TextNode => {
    const children = processNodes(
      node.children
    );
    return {
      children,
      content: node.content,
      type: getNodeType(node.type),
      styles: {
        isBold: node?.marks?.isBold ?? false,
        isItalic: node?.marks?.isItalic ?? false,
        isUnderlined: node?.marks?.isUnderlined ?? false,
        isStrikethrough: node?.marks?.isStrikethrough ?? false,
        isSuperscript: node?.marks?.isSuperscript ?? false,
        isSubscript: node?.marks?.isSubscript ?? false,
      },
    };
  });
};

const getTextNodes = (jsonString: string, trim: boolean): TextNode[] => {
  const root: {children?: UnprocessedNode[]} = JSON.parse(jsonString);
  const nodes = processNodes(root?.children ?? []);

  if (trim) {
    for (let i = nodes.length -1; i>=0; i--) {
      const node = nodes[i];
      if (node.children.length == 0 && (node?.content?.trim?.()?.length ?? 0) == 0) {
        nodes.pop();
        continue;
      }
      break;
    }
  }

  return nodes;
}

const getPlainTextNodes = (jsonString: string): PlainTextNode[] => {
  const root: {children?: UnprocessedNode[]} = JSON.parse(jsonString);
  return root?.children?.map((child: UnprocessedNode): PlainTextNode => {
    const type = getPlainNodeType(child.type);
    return {
      type,
      content: child.content
    } as PlainTextNode
  }) ?? [] as PlainTextNode[]
}

export async function getJSON<T>(
  state: SchemaRoot,
): Promise<T> {
  const trim = true;
  const localizedPhrases = {
    locales: {},
    localizedPhraseKeys: {},
    phraseKeyDebugInfo: {}
  };

  const localeSettings = getReferencedObject(state, "$(text).localeSettings")
  const phraseGroups = getReferencedObject(state, "$(text).phraseGroups")
  const defaultLocale = getReferencedObject(state, localeSettings.defaultLocaleRef)
  const defaultLocaleCode = defaultLocale?.localeCode;
  for (const locale of localeSettings.locales) {
    const localeRef = makeQueryRef("$(text).localeSettings.locales.localeCode<?>", locale.localeCode);
    const defaultFallbackCode = locale?.defaultFallbackLocaleRef
      ? locale?.defaultFallbackLocaleRef
      : localeSettings.defaultLocaleRef == localeRef
      ? null
      : defaultLocale.localeCode;
    localizedPhrases.locales[locale.localeCode] = {
      localeCode: locale.localeCode,
      name: locale.name,
      defaultFallbackCode,
      isGlobalDefault: defaultLocaleCode == locale.localeCode
    }
    localizedPhrases.localizedPhraseKeys[locale.localeCode] = {};
    const fallbackRef = (defaultFallbackCode
      ? makeQueryRef(
          "$(text).localeSettings.locales.localeCode<?>",
          defaultFallbackCode
        )
      : null) as QueryTypes['$(text).localeSettings.locales.localeCode<?>'];
    for (const phraseGroup of phraseGroups) {
      for (const phrase of phraseGroup.phrases) {
        const phraseKey = `${phraseGroup.id}.${phrase.id}`;
        localizedPhrases.phraseKeyDebugInfo[phraseKey] = {
          groupName: phraseGroup.name,
          phraseKey: phrase.phraseKey,
        }
        localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey] = {
          phraseKey,
          variables: {},
          contentVariables: {},
          styleClasses: {},
          args: {},
          links: {},
          interpolations: {},
          styledContents: {},
        };

        // DO VARIABLES FIRST
        for (const variable of phrase?.variables ?? []) {
          const varValue =
            variable.varType == "string"
              ? ""
              : variable.varType == "boolean"
              ? false
              : 0;
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].variables[variable.name] = varValue;
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].args[variable.name] = varValue;
        }
        for (const contentVariable of phrase?.contentVariables ?? []) {
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].contentVariables[contentVariable.name] = "string";
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].args[contentVariable.name] = "string";
        }
        for (const styleClass of phrase?.styleClasses ?? []) {
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].styleClasses[styleClass.name] = "string";
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].args[styleClass.name] = "string";
        }
        // DO INTERPOLATIONS SECOND
        for (const interpolation of phrase?.interpolationVariants ?? []) {
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].interpolations[interpolation.name] = {
            cases: []
          };
          const primaryVariable = getReferencedObject(state, interpolation.variableRef);
          const interpolationTranslationRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.interpolationVariants.name<?>.localeRules.id<?>",
            phraseGroup.id,
            phrase.id,
            interpolation.name,
            localeRef
          );
          const interpolationTranslation = getReferencedObject(
            state,
            interpolationTranslationRef
          );
          const fallbackInterpolationTranslationRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.interpolationVariants.name<?>.localeRules.id<?>",
            phraseGroup.id,
            phrase.id,
            interpolation.name,
            fallbackRef
          );

          const fallbackInterpolationTranslation = getReferencedObject(
            state,
            fallbackInterpolationTranslationRef
          );
          const defaultFallbackInterpolationTranslationRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.interpolationVariants.name<?>.localeRules.id<?>",
            phraseGroup.id,
            phrase.id,
            interpolation.name,
            localeSettings.defaultLocaleRef as QueryTypes['$(text).localeSettings.locales.localeCode<?>']
          );
          const defaultFallbackInterpolationTranslation = getReferencedObject(
            state,
            defaultFallbackInterpolationTranslationRef
          );
          const conditionals = interpolationTranslation?.conditionals?.filter?.(c => c.resultant?.plainText?.trim() != "") ?? [];
          if (conditionals.length == 0 && (interpolationTranslation?.defaultValue?.plainText ?? "").trim() == "") {
            const fallbackConditionals =
              fallbackInterpolationTranslation.conditionals?.filter?.(
                (c) => {
                  return c.resultant?.plainText?.trim() != ""
                }
              ) ?? [];
            if (fallbackConditionals.length == 0 && (fallbackInterpolationTranslation?.defaultValue?.plainText ?? "").trim() == "") {
              // use global default
              const defaultConditionals =
                defaultFallbackInterpolationTranslation.conditionals?.filter?.(
                  (c) => c.resultant?.plainText?.trim() != ""
                ) ?? [];
                const defaultJSON = defaultFallbackInterpolationTranslation?.defaultValue?.json ?? "{}";
                localizedPhrases.localizedPhraseKeys[locale.localeCode][
                  phraseKey
                ].interpolations[interpolation.name].default = getTextNodes(defaultJSON, trim);

                for (const conditional of defaultConditionals) {
                  const value = primaryVariable?.varType == "string" ?
                    conditional?.stringComparatorValue :
                    primaryVariable?.varType == "boolean" ?
                    conditional?.booleanComparatorValue :
                    primaryVariable?.varType == "integer" ?
                    conditional?.intComparatorValue :
                    conditional?.operator == "is_fractional" ?
                    undefined :
                    conditional?.floatComparatorValue;

                  const subcases = conditional?.subconditions?.map?.(subcondition => {
                    const subVar = getReferencedObject(state, subcondition.variableRef);
                    const value = subVar?.varType == "string" ?
                      subcondition?.stringComparatorValue :
                      subVar?.varType == "boolean" ?
                      subcondition?.booleanComparatorValue :
                      subVar?.varType == "integer" ?
                      subcondition?.intComparatorValue :
                      subcondition?.operator == "is_fractional" ?
                      undefined :
                      subcondition?.floatComparatorValue;
                      return {
                        value,
                        variable: subVar.name,
                        operator: subcondition.operator,
                        conjunction: subcondition.conjunction
                      }
                  }) ?? []

                  const resultantJSON = conditional?.resultant?.json ?? "{}";
                  const resultant = getTextNodes(resultantJSON, trim);
                  const conditionalCase = {
                    variable: primaryVariable.name,
                    operator: conditional.operator,
                    value,
                    subcases,
                    resultant
                  }
                  localizedPhrases.localizedPhraseKeys[locale.localeCode][
                    phraseKey
                  ].interpolations[interpolation.name].cases.push(conditionalCase);
                }

            } else {
              // use fallback
                const defaultJSON = fallbackInterpolationTranslation?.defaultValue?.json ?? "{}";
                localizedPhrases.localizedPhraseKeys[locale.localeCode][
                  phraseKey
                ].interpolations[interpolation.name].default = getTextNodes(defaultJSON, trim);

                for (const conditional of fallbackConditionals) {
                  const value = primaryVariable?.varType == "string" ?
                    conditional?.stringComparatorValue :
                    primaryVariable?.varType == "boolean" ?
                    conditional?.booleanComparatorValue :
                    primaryVariable?.varType == "integer" ?
                    conditional?.intComparatorValue :
                    conditional?.operator == "is_fractional" ?
                    undefined :
                    conditional?.floatComparatorValue;

                  const subcases = conditional?.subconditions.map?.(subcondition => {
                    const subVar = getReferencedObject(state, subcondition.variableRef);
                    const value = subVar?.varType == "string" ?
                      subcondition?.stringComparatorValue :
                      subVar?.varType == "boolean" ?
                      subcondition?.booleanComparatorValue :
                      subVar?.varType == "integer" ?
                      subcondition?.intComparatorValue :
                      subcondition?.operator == "is_fractional" ?
                      undefined :
                      subcondition?.floatComparatorValue;
                      return {
                        value,
                        variable: subVar.name,
                        operator: subcondition.operator,
                        conjunction: subcondition.conjunction
                      }
                  }) ?? [];

                  const resultantJSON = conditional?.resultant?.json ?? "{}";
                  const resultant = getTextNodes(resultantJSON, trim);
                  const conditionalCase = {
                    variable: primaryVariable.name,
                    operator: conditional.operator,
                    value,
                    subcases,
                    resultant
                  }
                  localizedPhrases.localizedPhraseKeys[locale.localeCode][
                    phraseKey
                  ].interpolations[interpolation.name].cases.push(conditionalCase);
              }
            }
          } else {
            // use conditionals
            const defaultJSON = interpolationTranslation?.defaultValue?.json ?? "{}";
            localizedPhrases.localizedPhraseKeys[locale.localeCode][
              phraseKey
            ].interpolations[interpolation.name].default = getTextNodes(defaultJSON, trim);

            for (const conditional of conditionals) {
              const value = primaryVariable?.varType == "string" ?
                conditional?.stringComparatorValue :
                primaryVariable?.varType == "boolean" ?
                conditional?.booleanComparatorValue :
                primaryVariable?.varType == "integer" ?
                conditional?.intComparatorValue :
                conditional?.operator == "is_fractional" ?
                undefined :
                conditional?.floatComparatorValue;

              const subcases = conditional?.subconditions?.map?.(subcondition => {
                const subVar = getReferencedObject(state, subcondition.variableRef);
                const value = subVar?.varType == "string" ?
                  subcondition?.stringComparatorValue :
                  subVar?.varType == "boolean" ?
                  subcondition?.booleanComparatorValue :
                  subVar?.varType == "integer" ?
                  subcondition?.intComparatorValue :
                  subcondition?.operator == "is_fractional" ?
                  undefined :
                  subcondition?.floatComparatorValue;
                  return {
                    value,
                    variable: subVar.name,
                    operator: subcondition.operator,
                    conjunction: subcondition.conjunction
                  }
              }) ?? [];

              const resultantJSON = conditional?.resultant?.json ?? "{}";
              const resultant = getTextNodes(resultantJSON, trim);
              const conditionalCase = {
                variable: primaryVariable.name,
                operator: conditional.operator,
                value,
                subcases,
                resultant
              }
              localizedPhrases.localizedPhraseKeys[locale.localeCode][
                phraseKey
              ].interpolations[interpolation.name].cases.push(conditionalCase);
            }
          }
        }

        // DO LINKS THIRD
        for (const link of phrase?.linkVariables ?? []) {
          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].links[link.linkName] = {};
          const linkRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.linkVariables.linkName<?>.translations.id<?>",
            phraseGroup.id,
            phrase.id,
            link.linkName,
            localeRef
          );
          const linkTranslation = getReferencedObject(state, linkRef);
          const fallbackLinkRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.linkVariables.linkName<?>.translations.id<?>",
            phraseGroup.id,
            phrase.id,
            link.linkName,
            fallbackRef
          );
          const fallbackLinkTranslation = getReferencedObject(state, fallbackLinkRef);

          const defaultLinkRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.linkVariables.linkName<?>.translations.id<?>",
            phraseGroup.id,
            phrase.id,
            link.linkName,
            localeSettings.defaultLocaleRef
          );
          const defaultLink = getReferencedObject(state, defaultLinkRef);

          if ((linkTranslation?.linkDisplayValue?.plainText ?? "")?.trim() != "") {
            const displayValueJSON = linkTranslation?.linkDisplayValue?.json ?? '{}';
            const displayValue = getTextNodes(displayValueJSON, trim);
            localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey].links[link.linkName] = {
              displayValue,
              linkName: link.linkName
            };
          } else {
            if ((fallbackLinkTranslation?.linkDisplayValue?.plainText ?? "").trim() != "") {
              const displayValueJSON = fallbackLinkTranslation?.linkDisplayValue?.json ?? '{}';
              const displayValue = getTextNodes(displayValueJSON, trim);
              localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey].links[link.linkName] = {
                displayValue,
                linkName: link.linkName
              };
            } else {
              const displayValueJSON = defaultLink?.linkDisplayValue?.json ?? '{}';
              const displayValue = getTextNodes(displayValueJSON, trim);
              localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey].links[link.linkName] = {
                displayValue,
                linkName: link.linkName
              };
            }
          }
          if ((linkTranslation?.linkHrefValue?.plainText ?? "")?.trim() != "") {
            const hrefJSON = linkTranslation?.linkHrefValue?.json ?? '{}';
            const hrefValue = getPlainTextNodes(hrefJSON);
            localizedPhrases.localizedPhraseKeys[locale.localeCode][
              phraseKey
            ].links[link.linkName].href = hrefValue;

          } else {
            if ((fallbackLinkTranslation?.linkHrefValue?.plainText ?? "").trim() != "") {
              const hrefJSON = fallbackLinkTranslation?.linkHrefValue?.json ?? '{}';
              const hrefValue = getPlainTextNodes(hrefJSON);
              localizedPhrases.localizedPhraseKeys[locale.localeCode][
                phraseKey
              ].links[link.linkName].href = hrefValue;
            } else {
              const hrefJSON = defaultLink?.linkHrefValue?.json ?? '{}';
              const hrefValue = getPlainTextNodes(hrefJSON);
              localizedPhrases.localizedPhraseKeys[locale.localeCode][
                phraseKey
              ].links[link.linkName].href = hrefValue;
            }
          }
        }
        // do styled content here
        for (const styledContent of phrase.styledContents) {

          const styleClass = getReferencedObject(state, styledContent.styleClassRef);

          localizedPhrases.localizedPhraseKeys[locale.localeCode][
            phraseKey
          ].styledContents[styledContent.name] = {};
          const styledContentLocaleRuleRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.styledContents.name<?>.localeRules.id<?>",
            phraseGroup.id,
            phrase.id,
            styledContent.name,
            localeRef
          );
          const styledContentLocaleRule = getReferencedObject(state, styledContentLocaleRuleRef);
          const fallbackStyledContentLocaleRuleRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.styledContents.name<?>.localeRules.id<?>",
            phraseGroup.id,
            phrase.id,
            styledContent.name,
            fallbackRef as QueryTypes['$(text).localeSettings.locales.localeCode<?>']
          );
          const fallbackStyledContentLocaleRule = getReferencedObject(
            state,
            fallbackStyledContentLocaleRuleRef
          );
          const defaultStyledContentLocaleRuleRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.styledContents.name<?>.localeRules.id<?>",
            phraseGroup.id,
            phrase.id,
            styledContent.name,
            localeSettings.defaultLocaleRef
          );
          const defaultStyledContentLocaleRule = getReferencedObject(
            state,
            defaultStyledContentLocaleRuleRef
          );

          if ((styledContentLocaleRule?.displayValue?.plainText ?? "")?.trim() != "") {
            const displayValueJSON =
              styledContentLocaleRule?.displayValue?.json ?? "{}";
            const displayValue = getTextNodes(displayValueJSON, trim);
            localizedPhrases.localizedPhraseKeys[locale.localeCode][
              phraseKey
            ].styledContents[styledContent.name] = {
              displayValue,
              styleClass: styleClass.name,
            };
          } else {
            if ((fallbackStyledContentLocaleRule?.displayValue?.plainText ?? "").trim() != "") {
              const displayValueJSON =
                fallbackStyledContentLocaleRule?.displayValue?.json ?? "{}";
              const displayValue = getTextNodes(displayValueJSON, trim);
              localizedPhrases.localizedPhraseKeys[locale.localeCode][
                phraseKey
              ].styledContents[styledContent.name] = {
                displayValue,
                styleClass: styleClass.name,
              };
            } else {
              const displayValueJSON =
                defaultStyledContentLocaleRule?.displayValue?.json ?? "{}";
              const displayValue = getTextNodes(displayValueJSON, trim);
              localizedPhrases.localizedPhraseKeys[locale.localeCode][
                phraseKey
              ].styledContents[styledContent.name] = {
                displayValue,
                styleClass: styleClass.name,
              };
            }
          }
        }

        if (phrase.usePhraseSections) {
          const newLine: TextNode = {
            content: "\n",
            type: "text",
            children: [],
            styles: {
              isBold: false,
              isItalic: false,
              isUnderlined: false,
              isStrikethrough: false,
              isSuperscript: false,
              isSubscript: false,
            },
          };
          const nodeLists: Array<TextNode> = [];

          for (const [index, phraseSection] of phrase.phraseSections.entries()) {
            const isLast = index == phrase.phraseSections.length - 1;
            const phraseSectionLocaleRuleRef = makeQueryRef(
              "$(text).phraseGroups.id<?>.phrases.id<?>.phraseSections.name<?>.localeRules.id<?>",
              phraseGroup.id,
              phrase.id,
              phraseSection.name,
              localeRef
            );
            const phraseSectionLocaleRule = getReferencedObject(
              state,
              phraseSectionLocaleRuleRef
            );
            const fallbackPhraseSectionLocaleRuleRef = makeQueryRef(
              "$(text).phraseGroups.id<?>.phrases.id<?>.phraseSections.name<?>.localeRules.id<?>",
              phraseGroup.id,
              phrase.id,
              phraseSection.name,
              fallbackRef as QueryTypes['$(text).localeSettings.locales.localeCode<?>']
            );

            const fallbackPhraseSectionLocaleRule = getReferencedObject(
              state,
              fallbackPhraseSectionLocaleRuleRef
            );

            const defaultPhraseSectionLocaleRuleRef = makeQueryRef(
              "$(text).phraseGroups.id<?>.phrases.id<?>.phraseSections.name<?>.localeRules.id<?>",
              phraseGroup.id,
              phrase.id,
              phraseSection.name,
              localeSettings.defaultLocaleRef
            );

            const defaultPhraseSectionLocaleRule = getReferencedObject(
              state,
              defaultPhraseSectionLocaleRuleRef
            );

            if ((phraseSectionLocaleRule?.displayValue?.plainText ?? "").trim() != "") {
              const phraseJSON = phraseSectionLocaleRule?.displayValue?.json ?? '{}';
              nodeLists.push(...getTextNodes(phraseJSON, trim));
            } else {
              if ((fallbackPhraseSectionLocaleRule?.displayValue?.plainText ?? "").trim() != "") {
                const phraseJSON = fallbackPhraseSectionLocaleRule?.displayValue?.json ?? '{}';
                nodeLists.push(...getTextNodes(phraseJSON, trim));
              } else {
                const phraseJSON = defaultPhraseSectionLocaleRule?.displayValue?.json ?? '{}';
                nodeLists.push(...getTextNodes(phraseJSON, trim));
              }
            }
            if (!isLast) {
              nodeLists.push(newLine);
            }
          }
          localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey].phrase = nodeLists;
        } else {
          const phraseTranslationRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.phraseTranslations.id<?>",
            phraseGroup.id,
            phrase.id,
            localeRef
          );
          const phraseTranslation = getReferencedObject(
            state,
            phraseTranslationRef
          );
          const fallbackPhraseTranslationRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.phraseTranslations.id<?>",
            phraseGroup.id,
            phrase.id,
            fallbackRef as QueryTypes['$(text).localeSettings.locales.localeCode<?>']
          );
          const fallbackPhraseTranslation = getReferencedObject(
            state,
            fallbackPhraseTranslationRef
          );
          const defaultPhraseTranslationRef = makeQueryRef(
            "$(text).phraseGroups.id<?>.phrases.id<?>.phraseTranslations.id<?>",
            phraseGroup.id,
            phrase.id,
            localeSettings.defaultLocaleRef
          );
          const defaultPhraseTranslation = getReferencedObject(
            state,
            defaultPhraseTranslationRef
          );

          if ((phraseTranslation?.plainText ?? "").trim() != "") {
            const phraseJSON = phraseTranslation?.json ?? '{}';
            localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey].phrase = getTextNodes(phraseJSON, trim);
          } else {
            if ((fallbackPhraseTranslation?.plainText ?? "").trim() != "") {
              const phraseJSON = fallbackPhraseTranslation?.json ?? '{}';
              localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey].phrase = getTextNodes(phraseJSON, trim);
            } else {
              const phraseJSON = defaultPhraseTranslation?.json ?? '{}';
              localizedPhrases.localizedPhraseKeys[locale.localeCode][phraseKey].phrase = getTextNodes(phraseJSON, trim);
            }
          }
        }
      }
    }
  }
  return localizedPhrases as T;
}