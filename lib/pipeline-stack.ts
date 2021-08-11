import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { ShellScriptAction, SimpleSynthAction, CdkPipeline } from "@aws-cdk/pipelines";
import { WorkshopPipelineStage } from './pipeline-stage';


export class WorkshopPipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const repo = new codecommit.Repository(this, 'WorkshopRepo', {
            repositoryName: 'WorkshopRepo'
        });

        // defines the artifact that represents our sourcecode.
        const sourceArtifact = new codepipeline.Artifact();

        // defines the artifact representing of the cloud assembly
        // (cloudformation template + all other assets)
        const  cloudAssemblyArtifact = new codepipeline.Artifact();

        // Our basic pipeline declaration. Setting the basic Structure of our pipeline.
        const pipeline = new CdkPipeline(this, 'Pipeline', {
            pipelineName: 'WorkshopPipeline',
            cloudAssemblyArtifact,

            // generate source artifact from the repo created above
            sourceAction: new codepipeline_actions.CodeCommitSourceAction({
                actionName: 'CodeCommit',
                output: sourceArtifact,
                repository: repo
            }),

            // builds our source code from whats declared above into a cloud assembly artifact
            synthAction: SimpleSynthAction.standardNpmSynth({
                sourceArtifact, // where we get teh coded to build
                cloudAssemblyArtifact, // where to place the built source

                buildCommand: 'npm run build' // language specific build cmd
            })
        })
        const deploy = new WorkshopPipelineStage(this, 'Deploy');
        // @ts-ignore
        const deployStage = pipeline.addApplicationStage(deploy);
        deployStage.addActions(new ShellScriptAction({
            actionName: 'TestViewerEndpoint',
            useOutputs: {
                // @ts-ignore
                ENDPOINT_URL: pipeline.stackOutput(deploy.hcViewerUrl)
            },
            commands: [
                'curl -Ssf $ENDPOINT_URL'
            ]
        }));
        deployStage.addActions(new ShellScriptAction({
            actionName: 'TestAPIGatewayEndpoint',
            useOutputs: {
                // @ts-ignore
                ENDPOINT_URL: pipeline.stackOutput(deploy.hcEndpoint)
            },
            commands: [
                'curl -Ssf $ENDPOINT_URL/',
                'curl -Ssf $ENDPOINT_URL/hello',
                'curl -Ssf $ENDPOINT_URL/test'
            ]
        }));
    }
}