import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lex from 'aws-cdk-lib/aws-lex';

export class LexbotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. IAM Role used by the Lex service to make runtime calls
    const botRuntimeRole = new iam.Role(this, 'BotRuntimeRole', {
      assumedBy: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonLexFullAccess')]
    });

    // 2. Inline bot definition which depends on the IAM role
    const bookTripTemplateBot = new lex.CfnBot(this, 'BookTripTemplateBot', {
      roleArn: botRuntimeRole.roleArn,
      name: 'BookTripWithCFN',
      dataPrivacy: {  ChildDirected : false },
      idleSessionTtlInSeconds: 300,
      description: 'How to create a BookTrip bot with CDK',
      autoBuildBotLocales: false,
      botLocales: [
        {
          localeId: 'en_US',
          description: 'Book a trip bot Locale',
          nluConfidenceThreshold: 0.40,
          voiceSettings: {
            voiceId: 'Ivy'
          },
          slotTypes: [
            {
              name: 'CarTypeValues',
              description: 'Slot Type description',
              slotTypeValues: [
                { sampleValue: { value: 'economy' } },
                { sampleValue: { value: 'standard' } },
                { sampleValue: { value: 'midsize' } },
                { sampleValue: { value: 'full size' } },
                { sampleValue: { value: 'luxury' } },
                { sampleValue: { value: 'minivan' } }
              ],
              valueSelectionSetting: { resolutionStrategy: 'ORIGINAL_VALUE' }
            },
            {
              name: 'RoomTypeValues',
              description: 'Slot Type description',
              slotTypeValues: [
                { sampleValue: { value: 'queen' } },
                { sampleValue: { value: 'king' } },
                { sampleValue: { value: 'deluxe' } }
              ],
              valueSelectionSetting: { resolutionStrategy: 'ORIGINAL_VALUE' }
            }
          ],
          intents: [
            {
              name: 'BookCar',
              description: 'Intent to book a car on StayBooker',
              sampleUtterances: [{utterance: 'Book a car'}, {utterance: 'Reserve a car'}, {utterance: 'Make a car reservation'}],
              slotPriorities: [
                { priority: 4, slotName: 'DriverAge' },
                { priority: 1, slotName: 'PickUpCity' },
                { priority: 3, slotName: 'ReturnDate' },
                { priority: 5, slotName: 'CarType' },
                { priority: 2, slotName: 'PickUpDate' }
              ],
              intentConfirmationSetting: {
                promptSpecification: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value: 'Okay, I have you down for a {CarType} rental in {PickUpCity} from {PickUpDate} to {ReturnDate}.  Should I book the reservation?'
                        }
                      }
                    }
                  ],
                  maxRetries: 3,
                  allowInterrupt: false
                },
                declinationResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value: 'Okay, I have cancelled your reservation in progress.'
                        }
                      }
                    }
                  ],
                  allowInterrupt: false
                }
              },
              slots: [
                { name: 'PickUpCity', description: 'something', slotTypeName: 'AMAZON.City', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'In what city do you need to rent a car?' } } }], maxRetries: 3, allowInterrupt: false } } },
                { name: 'PickUpDate', description: 'something', slotTypeName: 'AMAZON.Date', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'What day do you want to start your rental?' } } }], maxRetries: 3, allowInterrupt: false } } },
                { name: 'ReturnDate', description: 'something', slotTypeName: 'AMAZON.Date', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'What day do you want to return the car?' } } }], maxRetries: 3, allowInterrupt: false } } },
                { name: 'DriverAge', description: 'something', slotTypeName: 'AMAZON.Number', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'How old is the driver for this rental?' } } }], maxRetries: 3, allowInterrupt: false } } },
                { name: 'CarType', description: 'something', slotTypeName: 'CarTypeValues', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'What type of car would you like to rent?  Our most popular options are economy, midsize, and luxury' } } }], maxRetries: 3, allowInterrupt: false } } }
              ]
            },
            {
              name: 'BookHotel',
              description: 'Intent to book a hotel on StayBooker',
              sampleUtterances: [{utterance:'Book a hotel'}, {utterance:'I want a make hotel reservations'}, {utterance:'Book a {Nights} night stay in {Location}'}],
              intentConfirmationSetting: {
                promptSpecification: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value: 'Okay, I have you down for a {Nights} night stay in {Location} starting {CheckInDate}.  Shall I book the reservation?'
                        }
                      }
                    }
                  ],
                  maxRetries: 3,
                  allowInterrupt: false
                },
                declinationResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value: 'Okay, I have cancelled your reservation in progress.'
                        }
                      }
                    }
                  ],
                  allowInterrupt: true
                }
              },
              slotPriorities: [
                { priority: 4, slotName: 'RoomType' },
                { priority: 1, slotName: 'Location' },
                { priority: 3, slotName: 'Nights' },
                { priority: 2, slotName: 'CheckInDate' }
              ],
              slots: [
                { name: 'Location', description: 'something', slotTypeName: 'AMAZON.City', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'What city will you be staying in?' } } }], maxRetries: 3, allowInterrupt: false } } },
                { name: 'CheckInDate', description: 'something', slotTypeName: 'AMAZON.Date', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'What day do you want to check in?' } } }], maxRetries: 3, allowInterrupt: false } } },
                { name: 'Nights', description: 'something', slotTypeName: 'AMAZON.Number', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'How many nights will you be staying?' } } }], maxRetries: 3, allowInterrupt: false } } },
                { name: 'RoomType', description: 'something', slotTypeName: 'RoomTypeValues', valueElicitationSetting: { slotConstraint: 'Required', promptSpecification: { messageGroupsList: [{ message: { plainTextMessage: { value: 'What type of room would you like, queen, king or deluxe?' } } }], maxRetries: 3, allowInterrupt: false } } }
              ]
            },
            {
              name: 'FallbackIntent',
              description: 'Default intent when no other intent matches',
              parentIntentSignature: 'AMAZON.FallbackIntent'
            }
          ]
        }
      ]
    });
// 3. Define a bot version which depends on the DRAFT version of the Lex Bot
const bookTripBotVersionWithCFN = new lex.CfnBotVersion(this, 'BookTripBotVersionWithCFN', {
  botId: bookTripTemplateBot.ref,
  botVersionLocaleSpecification: [
    {
      localeId: 'en_US',
      botVersionLocaleDetails: { sourceBotVersion: 'DRAFT' }
    }
  ],
  description: 'BookTrip Version'
});

// 4. We define the alias by providing the bot version created by the AWS::Lex::BotVersion resource above
new lex.CfnBotAlias(this, 'FirstBotAliasWithCFN', {
  botId: bookTripTemplateBot.ref,
  botAliasName: 'BookTripVersion1Alias',
  botVersion: bookTripBotVersionWithCFN.attrBotVersion,
  sentimentAnalysisSettings: { DetectSentiment: true }
});
  }
}
