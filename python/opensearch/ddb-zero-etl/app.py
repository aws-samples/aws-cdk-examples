#!/usr/bin/env python3
import aws_cdk as cdk

from ddb_zero_etl.ddb_to_aoss_zero_etl_stack import DdbToAossZeroEtlStack


app = cdk.App()
DdbToAossZeroEtlStack(app, 'DdbZeroEtlStack')
app.synth()



