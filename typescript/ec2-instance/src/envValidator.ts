import { EC2ExampleProps } from './ec2-instance';

export enum InstanceSize {
  'LARGE' = 'large',
  'XLARGE' = 'xlarge',
  'XLARGE2' = 'xlarge2',
  'XLARGE4' = 'xlarge4',
}
export enum CPUTypes {
  'X86' = 'x86',
  'ARM64' = 'arm64',
}

export function envValidator(props: EC2ExampleProps) {
  const validCpuTypes = Object.keys(CPUTypes).join(', ');
  if (props.cpuType) {
    if (props.cpuType !== 'X86' && props.cpuType !== 'ARM64') {
      throw new Error(
        `Invalid CPU type.  Valid CPU Types are ${validCpuTypes}`,
      );
    }
  }

  if (props.instanceSize) {
    const validSizes = Object.keys(InstanceSize).join(', ');
    if (
      !Object.values(InstanceSize).includes(
        props.instanceSize.toLowerCase() as InstanceSize,
      )
    ) {
      throw new Error(`Invalid instance size. Valid sizes are: ${validSizes}`);
    }
  }
}
