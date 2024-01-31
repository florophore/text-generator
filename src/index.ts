import {
  SchemaRoot,
  getReferencedObject,
} from "./floro-generator-schema-api";
//@ts-ignore
import floroGeneratorFile from '../floro/floro.generator.json' assert {type: "json"};
import { quicktype, InputData, JSONSchemaInput, TypeScriptTargetLanguage } from "quicktype-core";
export { getJSON } from "./get-json";
import { getJSON } from "./get-json";

type Languages = 'typescript';

export function filename() {
  return __filename;
}

export function getFloroGenerator() {
  return floroGeneratorFile;
}

const CODE = `
// START INLINE CODE

const isStatementTrue = <T>(
  value: T,
  comparisonValue: T,
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ends_with" | "is_fractional"
): boolean => {
  if (operator == "eq") {
    return value == comparisonValue;
  }
  if (operator == "neq") {
    return value != comparisonValue;
  }
  const numberValue: number = value as number ?? 0;
  const comparisonNumberValue: number = comparisonValue as number ?? 0;
  if (operator == "gt") {
    return numberValue > comparisonNumberValue;
  }
  if (operator == "gte") {
    return numberValue >= comparisonNumberValue;
  }
  if (operator == "lt") {
    return numberValue < comparisonNumberValue;
  }
  if (operator == "lte") {
    return numberValue <= comparisonNumberValue;
  }
  if (operator == "ends_with") {
    return (numberValue?.toString?.() ?? "").endsWith(comparisonNumberValue?.toString?.() ?? "-1");
  }
  if (operator == "is_fractional" && typeof numberValue == "number") {
    return numberValue % 1 != 0;
  }
  return false;
};


declare type ARGTYPE<
  C,
  K extends keyof PhraseKeys
> = {
  [KV in keyof PhraseKeys[K]["variables"]]: PhraseKeys[K]["variables"][KV];
} & {
  [KCV in keyof PhraseKeys[K]["contentVariables"]]: C;
} & {
  [KSC in keyof PhraseKeys[K]["styleClasses"]]: (
    content: C,
    styledContentName: keyof PhraseKeys[K]["styledContents"] & string
  ) => C;
};

declare type HREF_MAP<K extends keyof PhraseKeys> = {
  [key in keyof PhraseKeys[K]["links"] as string]: string;
}

declare type LINK_MAP<C, K extends keyof PhraseKeys> = {
    [key in keyof PhraseKeys[K]["links"] as string]: StaticNode<C>[];
}

declare type INTERPOLATION_MAP<C, K extends keyof PhraseKeys> = {
  [key in keyof PhraseKeys[K]["interpolations"] as string]: StaticNode<C>[];
}

declare type STYLED_CONTENT_MAP<C, K extends keyof PhraseKeys> = {
  [key in keyof PhraseKeys[K]["styledContents"] as string]: {
    nodes: StaticNode<C>[];
    styleClass: keyof PhraseKeys[K]["styleClasses"];
  };
};


export const getPhraseValue = <C, T extends keyof Locales, K extends keyof PhraseKeys>(
  localizedPhrases: LocalizedPhrases,
  localeKey: T,
  phraseKey: K,
  args: ARGTYPE<C, K>
): StaticNode<C>[] => {
  const defaultLocaleCode: string = Object.values(localizedPhrases.locales).find(l => l.isGlobalDefault)?.localeCode;
  const locale = localizedPhrases.locales[localeKey];
  const phrase =
    localizedPhrases.localizedPhraseKeys?.[locale?.localeCode as keyof typeof localizedPhrases.localizedPhraseKeys]?.[
      phraseKey
    ] ?? localizedPhrases.localizedPhraseKeys?.[defaultLocaleCode as keyof typeof localizedPhrases.localizedPhraseKeys]?.[
      phraseKey
    ];
  if (!phrase) {
    return [{
      content: "",
      children: [],
      type: "text",
      styles: {
        isBold: false,
        isItalic: false,
        isStrikethrough: false,
        isSubscript: false,
        isSuperscript: false,
        isUnderlined: false,
      }
    }];
  }

  const interpolationMap = {} as {
    [k: string]: StaticNode<C>[];
  };
  for (const interpolationKey in phrase.interpolations) {
    const interpolation: Interpolation =
      phrase.interpolations[interpolationKey as keyof typeof phrase.interpolations];
    interpolationMap[interpolationKey] = getInterpolationValue(
      interpolation,
      args
    ) as StaticNode<C>[];
  }
  const hrefMap: Record<string, string> = {};
  for (const k in phrase.links) {
    const link: {
      linkName: string;
      href: PlainTextNode[];
      displayValue: TextNode[];
    } = phrase.links[k as keyof typeof phrase.links];
    hrefMap[k as string] = getStaticText(link.href, args);
  }
  const linkMap = {} as {
    [k: string]: StaticNode<C>[];
  };
  for (const linkKey in phrase.links) {
    const link: {
      linkName: string;
      href: PlainTextNode[];
      displayValue: TextNode[];
    } = phrase.links[linkKey as keyof typeof phrase.links];
    linkMap[linkKey] = getStaticNodes(
      link.displayValue,
      args,
      hrefMap as HREF_MAP<K>,
      {} as LINK_MAP<C, K>,
      interpolationMap as INTERPOLATION_MAP<C, K>
    ) as StaticNode<C>[];
  }

  const styledContentMap = {} as {
    [k: string]: {
      styleClass: keyof PhraseKeys[K]["styleClasses"];
      nodes: StaticNode<C>[];
    };
  };
  for (const styledContentKey in phrase.styledContents) {
    const styledContent: StyledContent =
      phrase.styledContents[styledContentKey as keyof typeof phrase.styledContents];
    styledContentMap[styledContentKey] = {
      styleClass:
        styledContent.styleClass as keyof PhraseKeys[K]["styleClasses"],
      nodes: getStaticNodes(
        styledContent.displayValue,
        args,
        hrefMap as HREF_MAP<K>,
        {} as LINK_MAP<C, K>,
        interpolationMap as INTERPOLATION_MAP<C, K>
      ) as StaticNode<C>[],
    };
  }
  return getStaticNodes(
    phrase.phrase,
    args,
    hrefMap as HREF_MAP<K>,
    linkMap as LINK_MAP<C, K>,
    interpolationMap as INTERPOLATION_MAP<C, K>,
    styledContentMap as STYLED_CONTENT_MAP<C, K>
  ) as StaticNode<C>[];
};

export interface StaticTextNode<C> {
  type: "text";
  content: string;
  styles: {
    isBold: boolean;
    isItalic: boolean;
    isUnderlined: boolean;
    isStrikethrough: boolean;
    isSuperscript: boolean;
    isSubscript: boolean;
  }
  children: StaticNode<C>[]
}

export interface StaticStyledTextNode<C, N extends string> {
  type: "styled-content";
  styleClass: string;
  styledContentName: N;
  styleClassFunction: (content: C, styledContentName: N) => C;
  content: string;
  styles: {
    isBold: boolean;
    isItalic: boolean;
    isUnderlined: boolean;
    isStrikethrough: boolean;
    isSuperscript: boolean;
    isSubscript: boolean;
  }
  children: StaticNode<C>[]
}

export interface StaticLinkNode<C> {
  type: "link";
  linkName: string;
  href: string;
  styles: {
    isBold: boolean;
    isItalic: boolean;
    isUnderlined: boolean;
    isStrikethrough: boolean;
    isSuperscript: boolean;
    isSubscript: boolean;
  }
  children: StaticNode<C>[]
}

export interface StaticUnOrderedListNode<C> {
  type: "ul";
  children: StaticListNode<C>[]
}

export interface StaticOrderedListNode<C> {
  type: "ol";
  children: StaticListNode<C>[]
}

export interface StaticListNode<C> {
  type: "li";
  children: StaticNode<C>[]
}

export interface StaticContentVariable<C> {
  type: "content";
  data: C,
}

export type StaticNode<C> = StaticTextNode<C> | StaticLinkNode<C> | StaticUnOrderedListNode<C> | StaticOrderedListNode<C> | StaticContentVariable<C>;

const getStaticNodes = <C, K extends keyof PhraseKeys>(
   textNodes: TextNode[],
   argMap: ARGTYPE<C, K>,
   hrefMap: HREF_MAP<K> = {} as HREF_MAP<K>,
   linkMap: LINK_MAP<C, K> = {} as LINK_MAP<C, K>,
   interpolationsMap: INTERPOLATION_MAP<C, K> = {} as INTERPOLATION_MAP<C, K>,
   styledContentsMap: STYLED_CONTENT_MAP<C, K> = {} as STYLED_CONTENT_MAP<C, K>
 ): (StaticNode<C> | StaticListNode<C>|StaticContentVariable<C>|StaticStyledTextNode<C, keyof PhraseKeys[K]["styledContents"]&string>)[] => {
   return textNodes.map((textNode) => {
     const children = getStaticNodes(
       textNode.children,
       argMap,
       hrefMap,
       linkMap,
       interpolationsMap,
       styledContentsMap
     );
     if (textNode.type == ContentType.Variable) {
       const variableName = textNode.content.substring(
         1,
         textNode.content.length - 1
       ) as keyof PhraseKeys[K]["variables"] & string;
       const variableValue =
         argMap?.[variableName]?.toString?.() ?? ("" as string);
       return {
         type: "text",
         content: variableValue,
         styles: textNode.styles,
         children: [],
       } as StaticTextNode<C>;
     }
     if (textNode.type == ContentType.ContentVariable) {
       const contentVariableName = textNode.content.substring(
         1,
         textNode.content.length - 1
       ) as keyof PhraseKeys[K]["contentVariables"] & string;
       const contentVariableValue: C = argMap?.[contentVariableName];
       return {
         type: "content",
         data: contentVariableValue,
       } as StaticContentVariable<C>;
     }
     if (textNode.type == ContentType.StyledContent) {
       const styledContentName = textNode.content.substring(
         1,
         textNode.content.length - 1
       ) as keyof PhraseKeys[K]["styledContents"] & string;
       const styledContentChildren = styledContentsMap?.[styledContentName] as {
         nodes: StaticNode<C>[],
         styleClass: keyof PhraseKeys[K]["styleClasses"]&string
       };
       const styleClassFunction =
         argMap?.[
           styledContentChildren?.styleClass as keyof PhraseKeys[K]["styleClasses"] &
             string
         ];
       return {
         type: "styled-content",
         styleClass: styledContentChildren?.styleClass,
         styledContentName,
         styleClassFunction,
         content: "",
         styles: textNode.styles,
         children: styledContentChildren.nodes,
       } as StaticStyledTextNode<C, keyof PhraseKeys[K]["styledContents"] & string>;
     }

     if (textNode.type == ContentType.Interpolation) {
       const interpolationName = textNode.content.substring(
         1,
         textNode.content.length - 1
       ) as keyof PhraseKeys[K]["interpolations"] & string;
       const interpolationChildren = interpolationsMap[
         interpolationName
       ] as StaticNode<C>[];
       return {
         type: "text",
         content: "",
         styles: textNode.styles,
         children: interpolationChildren,
       } as StaticTextNode<C>;
     }
     if (textNode.type == ContentType.Link) {
       const linkName = textNode.content.substring(
         1,
         textNode.content.length - 1
       ) as keyof PhraseKeys[K]["links"] & string;
       const linkChildren = linkMap[linkName] as StaticNode<C>[];
       return {
         type: "link",
         linkName,
         href: hrefMap[linkName],
         styles: textNode.styles,
         children: linkChildren,
       } as StaticLinkNode<C>;
     }
     if (textNode.type == ContentType.Li) {
       return {
         type: "li",
         children,
       } as StaticListNode<C>;
     }
     if (textNode.type == ContentType.Ol) {
       const listChildren = children as unknown as StaticListNode<C>[];
       return {
         type: "ol",
         children: listChildren,
       } as StaticOrderedListNode<C>;
     }
     if (textNode.type == ContentType.UL) {
       const listChildren = children as unknown as StaticListNode<C>[];
       return {
         type: "ul",
         children: listChildren,
       } as StaticUnOrderedListNode<C>;
     }
     return {
       type: "text",
       content: textNode.content,
       styles: textNode.styles,
       children,
     } as StaticTextNode<C>;
   });
 };

const getInterpolationValue = <
 C,
 K extends keyof PhraseKeys,
 > (
     interpolation: Interpolation,
     args: ARGTYPE<C, K>
 ) => {
   for (const caseStatement of interpolation.cases) {
     const argValue = args[caseStatement.variable as keyof typeof args];
     const comparatorValue = caseStatement.value as unknown as typeof argValue;
     const operator = caseStatement.operator as "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ends_with" | "is_fractional";
     if (!isStatementTrue(argValue, comparatorValue, operator)) {
       continue;
     }
     let allSubcasesAreTrue = true;
     for (const subcase of caseStatement.subcases) {
       const comparatorValue = subcase.value as unknown as typeof argValue;
         if (!isStatementTrue(argValue, comparatorValue, operator)) {
           allSubcasesAreTrue = false;
           break;
         }
       }
       if (!allSubcasesAreTrue) {
         break;
       }
       return getStaticNodes(caseStatement.resultant, args);
   }
   return getStaticNodes(interpolation.default, args);
}

const getStaticText = <
  K extends keyof PhraseKeys,
  A extends PhraseKeys[K]["variables"]
>(
  plainTextNodes: PlainTextNode[],
  variableMap: A,
): string => {
  return plainTextNodes.map((textNode) => {
    if (textNode.type == "variable") {
      const variableName = textNode.content.substring(
        1,
        textNode.content.length - 1
      ) as keyof PhraseKeys[K]["variables"]&string;
      const variableValue = variableMap?.[variableName]?.toString() ?? "" as string;
      return variableValue;
    }
    return textNode.content;
  }).join("");
};

export const getDebugInfo = <
  K extends keyof PhraseKeyDebugInfo,
>(
  phraseKeyDebugInfo: PhraseKeyDebugInfo,
  key: K,
): DebugInfo => {
  return phraseKeyDebugInfo[key];
};
`.trim();

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

export async function generate(
  state: SchemaRoot,
  outDir: string,
  args: { lang: Languages } = { lang: "typescript" }
) {
  let noLinks = true;
  let noInterpolations = true;
  let noStyledContents = true;
  const SCHEMA = {
    $schema: "http://json-schema.org/draft-06/schema#",
    $ref: "#/definitions/LocalizedPhrases",
    definitions: {
      Styles: {
        type: "object",
        properties: {
          isBold: {
            type: ["boolean"],
          },
          isItalic: {
            type: ["boolean"],
          },
          isUnderlined: {
            type: ["boolean"],
          },
          isStrikethrough: {
            type: ["boolean"],
          },
          isSuperscript: {
            type: ["boolean"],
          },
          isSubscript: {
            type: ["boolean"],
          },
        },
        required: [
          "isBold",
          "isItalic",
          "isUnderlined",
          "isStrikethrough",
          "isSuperscript",
          "isSubscript",
        ],
        additionalProperties: false,
      },
      ContentType: {
        type: "string",
        oneOf: [
          { const: "text" },
          { const: "li" },
          { const: "ul" },
          { const: "ol" },
          { const: "interpolation" },
          { const: "link" },
          { const: "variable" },
          { const: "content-variable" },
          { const: "styled-content" },
        ],
      },
      TextNode: {
        type: "object",
        properties: {
          content: {
            type: ["string"],
          },
          type: {
            $ref: "#/definitions/ContentType",
          },
          styles: {
            $ref: "#/definitions/Styles",
          },
          children: {
            type: "array",
            items: {
              $ref: "#/definitions/TextNode",
            },
          },
        },
        required: ["content", "styles", "type", "children"],
        additionalProperties: false,
      },
      PlainTextNode: {
        type: "object",
        properties: {
          content: {
            type: ["string"],
          },
          type: {
            type: "string",
            oneOf: [{ const: "text" }, { const: "variable" }],
          },
        },
        required: ["content", "type"],
        additionalProperties: false,
      },
      SubCase: {
        type: "object",
        properties: {
          variable: {
            type: ["string"],
          },
          value: {
            type: ["string", "number", "boolean"],
          },
          conjunction: {
            type: "string",
            oneOf: [{ const: "AND" }],
          },
          operator: {
            type: "string",
            oneOf: [
              { const: "eq" },
              { const: "neq" },
              { const: "gt" },
              { const: "gte" },
              { const: "lt" },
              { const: "lte" },
              { const: "ends_with" },
              { const: "is_fractional" },
            ],
          },
        },
        required: ["variable", "operator", "conjunction"],
        additionalProperties: false,
      },
      Case: {
        type: "object",
        properties: {
          variable: {
            type: ["string"],
          },
          value: {
            type: ["string", "number", "boolean"],
          },
          operator: {
            type: "string",
            oneOf: [
              { const: "eq" },
              { const: "neq" },
              { const: "gt" },
              { const: "gte" },
              { const: "lt" },
              { const: "lte" },
              { const: "ends_with" },
              { const: "is_fractional" },
            ],
          },
          subcases: {
            type: "array",
            items: {
              $ref: "#/definitions/SubCase",
            },
          },
          resultant: {
            type: "array",
            items: {
              $ref: "#/definitions/TextNode",
            },
          },
        },
        required: ["variable", "operator", "subcases", "resultant"],
        additionalProperties: false,
      },
      Interpolation: {
        type: "object",
        properties: {
          cases: {
            type: "array",
            items: {
              $ref: "#/definitions/Case",
            },
          },
          default: {
            type: "array",
            items: {
              $ref: "#/definitions/TextNode",
            },
          },
        },
        required: ["cases", "default"],
        additionalProperties: false,
      },
      Link: {
        type: "object",
        properties: {
          linkName: {
            type: ["string"],
          },
          href: {
            type: "array",
            items: {
              $ref: "#/definitions/PlainTextNode",
            },
          },
          displayValue: {
            type: "array",
            items: {
              $ref: "#/definitions/TextNode",
            },
          },
        },
        required: ["linkName", "displayValue"],
        additionalProperties: false,
      },
      StyledContent: {
        type: "object",
        properties: {
          name: {
            type: ["string"],
          },
          styleClass: {
            type: ["string"],
          },
          displayValue: {
            type: "array",
            items: {
              $ref: "#/definitions/TextNode",
            },
          },
        },
        required: ["name", "styleClass", "displayValue"],
        additionalProperties: false,
      },
      DebugInfo: {
        type: "object",
        properties: {
          groupName: {
            type: ["string"],
          },
          phraseKey: {
            type: ["string"],
          },
        },
        required: ["groupName", "phraseKey"],
        additionalProperties: false,
      },
      Locales: {
        type: "object",
        properties: {},
        required: [] as string[],
        additionalProperties: false,
      },
      PhraseKeys: {
        type: "object",
        properties: {},
        required: [] as string[],
        additionalProperties: false,
      },
      PhraseKeyDebugInfo: {
        type: "object",
        properties: {},
        required: [] as string[],
        additionalProperties: false,
      },
      LocalizedPhraseKeys: {
        type: "object",
        properties: {},
        required: [] as string[],
        additionalProperties: false,
      },
      PhraseType: {
        type: "object",
        additionalProperties: false,
        required: [
          "phraseKey",
          "variables",
          "links",
          "interpolations",
          "phrase",
          "contentVariables",
          "styleClasses",
          "styledContents",
          "args",
        ],
        properties: {
          phraseKey: {
            type: ["string"],
          },
          phrase: {
            type: "array",
            items: {
              $ref: "#/definitions/TextNode",
            },
          },
          args: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          variables: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          contentVariables: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          styleClasses: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          styledContents: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          links: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          interpolations: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
        },
      },
      LocalizedPhrases: {
        type: "object",
        properties: {
          locales: {
            $ref: "#/definitions/Locales",
          },
          localizedPhraseKeys: {
            $ref: "#/definitions/LocalizedPhraseKeys",
          },
          phraseKeyDebugInfo: {
            $ref: "#/definitions/PhraseKeyDebugInfo",
          },
        },
        required: ["locales", "localizedPhraseKeys", "phraseKeyDebugInfo"],
        additionalProperties: false,
      },
    },
  };
  const localeSettings = getReferencedObject(state, "$(text).localeSettings")
  const phraseGroups = getReferencedObject(state, "$(text).phraseGroups")
  for (const locale of localeSettings.locales) {
    SCHEMA.definitions.Locales.properties[locale.localeCode] = {
      type: "object",
      additionalProperties: false,
      required: ["localeCode", "name", "defaultFallbackCode", "isGlobalDefault"],
      properties: {
        localeCode: {
          type: ["string"],
        },
        name: {
          type: ["string"],
        },
        defaultFallbackCode: {
          type: ["string", "null"],
        },
        isGlobalDefault: {
          type: ["boolean"],
        },
      },
    };
    SCHEMA.definitions.LocalizedPhraseKeys.properties[locale.localeCode] = {
      $ref: "#/definitions/PhraseKeys",
    }
    SCHEMA.definitions.LocalizedPhraseKeys.required.push(
      locale.localeCode
    );
  }

  for (const phraseGroup of phraseGroups) {
    for (const phrase of phraseGroup.phrases) {
      const phraseKey = `${phraseGroup.id}.${phrase.id}`;
      SCHEMA.definitions.PhraseKeyDebugInfo.required.push(phraseKey);
      SCHEMA.definitions.PhraseKeyDebugInfo.properties[phraseKey] = {
          $ref: "#/definitions/DebugInfo",
      };
      SCHEMA.definitions.PhraseKeys.required.push(phraseKey);
      SCHEMA.definitions.PhraseKeys.properties[phraseKey] = {
        type: "object",
        additionalProperties: false,
        required: [
          "phraseKey",
          "variables",
          "links",
          "interpolations",
          "phrase",
          "contentVariables",
          "styleClasses",
          "styledContents",
          "args",
        ],
        properties: {
          phraseKey: {
            type: ["string"],
          },
          phrase: {
            type: "array",
            items: {
              $ref: "#/definitions/TextNode",
            },
          },
          args: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          variables: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          contentVariables: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          styleClasses: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          styledContents: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          links: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
          interpolations: {
            type: "object",
            properties: {},
            required: [] as string[],
            additionalProperties: false,
          },
        },
      };
      for (const variable of phrase?.variables ?? []) {
        const varType =
          variable.varType == "string"
            ? "string"
            : variable.varType == "boolean"
            ? "boolean"
            : "number";
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.variables.properties[
          variable.name
        ] = {
          type: [varType],
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.variables.required.push(
          variable.name
        );
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.args.properties[
          variable.name
        ] = {
          type: [varType],
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.args.required.push(
          variable.name
        );
      }
      for (const contentVariable of phrase?.contentVariables ?? []) {
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.contentVariables.properties[
          contentVariable.name
        ] = {
          type: ["string"],
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.contentVariables.required.push(
          contentVariable.name
        );
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.args.properties[
          contentVariable.name
        ] = {
          type: ["string"],
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.args.required.push(
          contentVariable.name
        );
      }
      for (const styleClass of phrase?.styleClasses ?? []) {
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.styleClasses.properties[
          styleClass.name
        ] = {
          type: ["string"],
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.styleClasses.required.push(
          styleClass.name
        );
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.args.properties[
          styleClass.name
        ] = {
          type: ["string"],
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.args.required.push(
          styleClass.name
        );
      }
      for (const interpolation of phrase?.interpolationVariants ?? []) {
        noInterpolations = false;
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.interpolations.properties[
          interpolation.name
        ] = {
          $ref: "#/definitions/Interpolation",
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.interpolations.required.push(
          interpolation.name
        );
      }
      for (const styledContent of phrase?.styledContents ?? []) {
        noStyledContents = false;
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.styledContents.properties[
          styledContent.name
        ] = {
          $ref: "#/definitions/StyledContent",
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.styledContents.required.push(
          styledContent.name
        );
      }
      for (const linkVariables of phrase?.linkVariables ?? []) {
        noLinks = false;
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.links.properties[
          linkVariables.linkName
        ] = {
          $ref: "#/definitions/Link",
        };
        SCHEMA.definitions.PhraseKeys.properties[phraseKey].properties.links.required.push(
          linkVariables.linkName
        );
      }
    }
  }

  const inputData = new InputData();
  const source = { name: "LocalizedPhrases", schema: JSON.stringify(SCHEMA) };
  await inputData.addSource(
    "schema",
    source,
    () => new JSONSchemaInput(undefined)
  );

  const fs = await import('fs');
  const path = await import('path');

  if (args.lang == 'typescript') {
    const lang = new TypeScriptTargetLanguage();
    const runtimeTypecheck = lang.optionDefinitions.find(option => option.name == 'runtime-typecheck')
    if (runtimeTypecheck) {
      runtimeTypecheck.defaultValue = false;
    }
    const { lines } = await quicktype({ lang, inputData });
    const code = lines.join("\n");
    const tsFile = path.join(outDir, 'index.ts');
    let tsCode = "";
    tsCode += code + '\n';
    tsCode += CODE + '\n\n';
    if (noLinks) {
      tsCode += '\n\n' +`
interface PlainTextNode {
  content: string;
  type: "text" | "variable";
}
`.trim()
    }
    if (noStyledContents) {
      tsCode += '\n\n' +`
interface StyledContent {
  name: string;
  styleClass: string;
  displayValue: TextNode[];
}
`.trim()
    }
    if (noInterpolations) {
      tsCode += '\n\n' +`
interface Interpolation {
  cases: Array<{
    resultant: TextNode[];
    variable: string;
    value: string | number | boolean;
    operator: string;
    subcases: Array<{
      value: string | number | boolean;
    }>;
  }>;
  default: [];
}
`.trim()
    }
    await fs.promises.writeFile(tsFile, tsCode, 'utf-8');
    const textJson = await getJSON(state);
    const jsonFile = path.join(outDir, 'text.json');
    await fs.promises.writeFile(jsonFile, JSON.stringify(textJson, null, 2), 'utf-8');
  }
}