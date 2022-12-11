import { camelCase } from 'change-case-all';
import { Config } from '../config/config-value';
import { DART_KEYWORDS, FlutterFreezedPluginConfig, DartIdentifierCasing } from '../config/plugin-config';
import { TypeName, FieldName } from '../config/type-field-name';
import { dartCasing } from '../utils';

export type BlockNameValue = string;

/**
 * @name BlockName
 * @description Unlike the `TypeName` which is a comma-separated string of GraphQL Type Names, the `BlockName` is a Dart keyword escaped valid identifier which becomes the name of the generated Freezed Block.
 * @exampleMarkdown
 * ```ts filename:"config.ts"
 * TODO: add an example
 * ```
 * */
export class BlockName {
  private _value: string;

  private constructor(value: string /* type: string */) {
    this._value = value;
  }

  public get value(): string {
    return this._value;
  }

  /**
   * checks whether name is a Dart Language keyword
   * @param name The name or identifier to be checked
   * @returns `true` if name is a Dart Language keyword, otherwise `false`
   */
  public static isDartKeyword = (name: string) => Object.hasOwn(DART_KEYWORDS, name);

  /**
   * Ensures that the blockName isn't a valid Dart language reserved keyword. It wraps the blockName the dartKeywordEscapePrefix, dartKeywordEscapeSuffix and dartKeywordEscapeCasing specified in the config
   * @param config
   * @param name
   * @param typeName
   * @returns
   */
  public static escapeDartKeyword = (
    config: FlutterFreezedPluginConfig,
    typeName: TypeName,
    fieldName?: FieldName
  ): string => {
    if (typeName && this.isDartKeyword(name.value)) {
      const escapeDartKeywords = Config.escapeDartKeywords(config);
      if (typeof escapeDartKeywords === 'boolean') {
        const escapedBlockName = `${name}_`;
        return dartCasing(escapedBlockName);
      } else if (typeof escapeDartKeywords !== 'undefined') {
        const prefix = optionFromAnyConfig(escapeDartKeywords[name.value], 'dartKeywordEscapePrefix', '');
        const suffix = optionFromAnyConfig(escapeDartKeywords[name.value], 'dartKeywordEscapeSuffix', '_');
        const casing = optionFromAnyConfig(escapeDartKeywords[name.value], 'dartKeywordEscapeCasing');

        const escapedBlockName = `${prefix}${name}${suffix}`;

        return dartCasing(escapedBlockName, casing);
      }
    }
    return name.value;
  };

  public static shouldDecorateWithAtJsonKey = (
    blockType: 'enum_field' | 'parameter_field',
    config: FlutterFreezedPluginConfig,
    typeName: TypeName,
    fieldName: FieldName
  ): boolean => {
    const alwaysUseJsonKeyName = config.typeConfig?.[typeName.value]?.alwaysUseJsonKeyName;
    const useJsonKeyName =
      typeof alwaysUseJsonKeyName === 'boolean' ? alwaysUseJsonKeyName : alwaysUseJsonKeyName?.[fieldName.value];
    const alreadyCamelCased = !this.isDartKeyword(fieldName.value) && camelCase(fieldName.value) === fieldName.value;

    if (useJsonKeyName) {
      return true;
    } else if (alreadyCamelCased) {
      return false;
    } else if (blockType === 'enum_field') {
      return config.camelCasedEnums !== undefined;
    }
    return false;
  };

  private static fromString = (
    config: FlutterFreezedPluginConfig,
    typeName: TypeName,
    fieldName?: FieldName,
    casing?: DartIdentifierCasing,
    decorateWithAtJsonKey?: boolean
  ) => {
    const escapedBlockName = BlockName.escapeDartKeyword(config, fieldName, typeName);

    const casedBlockName = dartCasing(escapedBlockName, casing);

    if (this.isDartKeyword(casedBlockName)) {
      const escapedBlockName = BlockName.escapeDartKeyword(config, TypeName.fromString(casedBlockName), typeName);
      return new BlockName(
        decorateWithAtJsonKey ? `@JsonKey(name: '${fieldName}') ${escapedBlockName}` : escapedBlockName
      );
    }
    return new BlockName(decorateWithAtJsonKey ? `@JsonKey(name: '${fieldName}') ${casedBlockName}` : casedBlockName);
  };

  public static asEnumTypeName = (config: FlutterFreezedPluginConfig, typeName: TypeName): string =>
    BlockName.fromString(config, typeName, undefined, 'PascalCase').value;

  public static asEnumValueName = (
    config: FlutterFreezedPluginConfig,
    typeName: TypeName,
    fieldName: FieldName
  ): string => {
    const decorateWithAtJsonKey = BlockName.shouldDecorateWithAtJsonKey('enum_field', config, typeName, fieldName);
    const casing = Config.camelCasedEnums(config);
    return BlockName.fromString(config, fieldName, typeName, casing, decorateWithAtJsonKey).value;
  };

  public static asClassName = (config: FlutterFreezedPluginConfig, typeName: TypeName): string =>
    BlockName.fromString(config, typeName, undefined, 'PascalCase').value;

  public static asNamedConstructor = (
    config: FlutterFreezedPluginConfig,
    typeName: TypeName,
    namedConstructor: string
  ): string =>
    FactoryName.fromNamed(
      BlockName.fromString(config, typeName, undefined, 'PascalCase'),
      BlockName.fromString(config, FieldName.fromString(namedConstructor), undefined, 'camelCase')
    ).value;

  public static asParameterName = (
    config: FlutterFreezedPluginConfig,
    typeName: TypeName,
    fieldName: FieldName
  ): string => {
    const decorateWithAtJsonKey = BlockName.shouldDecorateWithAtJsonKey('enum_field', config, typeName, fieldName);
    return BlockName.fromString(config, fieldName, typeName, 'camelCase', decorateWithAtJsonKey).value;
  };
}

class FactoryName {
  private _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public get value(): string {
    return this._value;
  }

  public static fromNamed = (blockName: BlockName, namedConstructor: BlockName) => {
    return new FactoryName(`${blockName?.value}.${namedConstructor.value}`);
  };
}
