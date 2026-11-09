import type { ReactDoctorConfig } from 'react-doctor/api';

export default {
  ignore: {
    files: ['src/rules/**', 'src/server/**', 'scripts/**', 'test/**', '*.config.ts'],
  },
  supplyChain: {
    enabled: false,
  },
} satisfies ReactDoctorConfig;
