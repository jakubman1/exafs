import {Validator} from "./validators";

export type DDPPreset = {
    name: string;
    id: number;
    editable: string[];
    fields: {
        rule_type: DDPRuleType;
        threshold_bps?: number;
        threshold_pps?: number;
        vlan?: number;
        protocol?: string;
        threshold_syn_soft?: number;
        threshold_syn_hard?: number;
        fragmentation?: string;
        packet_lengths?: string;
        limit_bps?: number;
        limit_pps?: number;
        validity_timeout?: string;
        algorithm_type?: string;
        table_exponent?: number;
    }
}

export enum SliderType {
    LINEAR,
    LOGARITHMIC
}

export enum DDPRuleType {
    AMPLIFICATION = 'amplification',
    SYN_DROP = 'syn_drop',
    FILTER = 'filter',
    TCP_AUTHENTICATOR = 'tcp_authenticator'
}

export enum PresetFieldType {
    TEXT = 'text',
    NUMBER = 'number',
    RANGE = 'range',
    BOOL = 'bool',
    ENUM = 'enum'
}

export enum PresetFieldRequirementRelationship {
    IsSet,
    IsNotSet,
    IsGreater,
    IsLower,
    IsGreaterOrEqual,
    IsLowerOrEqual,
    IsEqual,
    IsNotEqual,
}

export type EnumPresetFieldOpts = {
    values: string[] | { value: any, display: string }[];
    multi: boolean;
}

export type RangePresetFieldOpts = {
    low: number;
    high: number;
    unit: string;
    type: SliderType;
}

export type DDPPresetField = {
    printName: string;
    name: string
    description?: string;
    formId?: number;
    defaultValue: any;
    type: PresetFieldType;
    rule_types: DDPRuleType[];
    options?: EnumPresetFieldOpts | RangePresetFieldOpts;
    validators?: Validator[];
    requires_fields?: [{ name: string, relationship: PresetFieldRequirementRelationship, rule_types: DDPRuleType[] }]
}