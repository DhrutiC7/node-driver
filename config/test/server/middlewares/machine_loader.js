exports.config = {
    'machines': [{
        'id': '7735832b-83be-430e-a22e-dd18cd201127',
        'data-interface': 'modbus',
        'options': {
            'host': '127.0.0.1',
            'port': '9100',
            'protocol': 'tcp',
            'unit-id': 1
        },
        'controlRegisters': {
            'coils': [],
            'discreteInputs': [],
        
            'holdingRegisters': [{
                'key': 'HOLDING_INDICATOR',
                'type': 'INT',
                'value': 0,
                'scale': 1,
                'register': 501,
                'length': 1
            }, {
                'key': 'INPUT_INDICATOR',
                'type': 'INT',
                'value': 0,
                'scale': 1,
                'register': 162,
                'length': 1
            }],
        
            'inputRegisters': []
        },
        'commonParameters': {
            'coils': [],
            'discreteInputs': [],

            'holdingRegisters': [{
                'key': 'INFEED_CONTROL',
                'type': 'BOOL',
                'value': 0,
                'scale': 1,
                'register':1052,
                'length': 1
            }]
        },
        'c1Parameters': {
            'coils': [],
            'discreteInputs': [],
            'holdingRegisters': [{
                'key': 'C1_MAIN_FEEDER_AMP',
                'type': 'INT',
                'value': 0,
                'scale': 1,
                'register': 665,
                'length': 1
            }]
        },
        'c2Parameters': {
            'coils': [],
            'discreteInputs': [],
            'holdingRegisters': [{
                'key': 'C2_MAIN_FEEDER_AMP',
                'type': 'INT',
                'value': 0,
                'scale': 1,
                'register': 665,
                'length': 1
            }]
        } 
    }]
}