import { BuidlerConfig, usePlugin } from "@nomiclabs/buidler/config";

usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-typechain");

const config: BuidlerConfig = {
	solc: {
		version: '0.6.6',
	},
	paths: {
		sources: './src',
		tests: './test',
	},
	typechain: {
    	outDir: "typechain",
    	target: "ethers"
  	},
};

export default config;
