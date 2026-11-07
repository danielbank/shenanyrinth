# PROTOTYPE helper: inlines balance-sim.js into balance-sim.shell.html -> balance-sim.html (python3 prototypes/build-balance-sim.py)
import sys
d='/Users/danielbank/workspace/shenanyrinth/prototypes/'
shell=open(d+'balance-sim.shell.html').read(); sim=open(d+'balance-sim.js').read()
shell=shell.split('\n',1)[1]  # drop build comment
out='<!doctype html>\n<!-- PROTOTYPE (throwaway): Shenanyrinth balance simulation, issue #17. One self-contained file: open it in a browser. -->\n'+shell.replace('/*__SIM__*/', sim)
open(d+'balance-sim.html','w').write(out)
